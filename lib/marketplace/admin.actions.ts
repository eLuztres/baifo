'use server';

import { after } from 'next/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/db/prisma';
import { isAdmin } from '@/lib/auth-guard';
import { ANY_CONDITION, LISTING_TYPES, PRODUCT_CONDITIONS, SERVICE_TYPES } from '@/lib/constants';
import { fromShopDateTime } from '@/lib/event-date';
import { getEnabledLocales, getShopLocale, getT } from '@/lib/i18n-server';
import { aiErrorText } from '@/lib/ai-errors';
import { pictureOf } from '@/lib/video';
import { categoryName, categoryRefs, findCategory, getListingCategories, toProductTranslations, type ListingTranslations } from './catalog';
import { createPicture, translateText, writeListing } from './ai';
import { loadAddresses } from './address-search';
import { HOUSE_SELLER, LISTING_PRICES, publishUrl, UNPAID_LISTING_HOURS } from './config';
import { botText, localeOf } from './messages';
import { fetchImage, uploadImage } from './media';
import { TEXT_MODES, type ListingTexts, type TextMode, type TextVersions } from './text-versions';
import { makeListingPictures, processSubmission } from './processing';
import { lacksConsent, markSent } from './listing-payment';
import { enableListing, publishByAdmin, takeDown } from './publish';
import { rejectSubmission } from './review';

// Server actions are public endpoints: every one checks for an admin itself.
const NOT_ALLOWED = { success: false, message: 'Solo para administradores' } as const;

// Only photos uploaded through UploadThing, so the server never fetches an arbitrary URL.
const photoUrlSchema = z.string().refine((value) => {
  if (!URL.canParse(value)) return false;
  const { protocol, hostname } = new URL(value);
  return protocol === 'https:' && (hostname === 'utfs.io' || hostname.endsWith('.ufs.sh'));
});

// No photos: the AI makes the picture from the description later (usual for a wanted ad).
// useAi false: the photos and videos are used as they are, no AI pictures.
const newListingSchema = z.object({
  photos: z.array(photoUrlSchema).max(8),
  type: z.enum(LISTING_TYPES).default('PRODUCT'),
  useAi: z.boolean().default(true),
});

export type NewListingInput = z.input<typeof newListingSchema>;

/** Step 1: the photos alone; the AI starts on the shop pictures while the admin goes on to the description. */
export async function createAdminListing(input: NewListingInput) {
  if (!(await isAdmin())) return NOT_ALLOWED;
  const parsed = newListingSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: 'Revisa las fotos' };

  const seller = await prisma.seller.upsert({ where: { waId: HOUSE_SELLER }, update: {}, create: { waId: HOUSE_SELLER } });
  // COLLECTING until the description arrives: only the pictures are made now.
  const { photos, type, useAi } = parsed.data;
  if (!useAi && photos.length === 0) return { success: false, message: 'Sube una foto o un vídeo' };
  // Without AI the originals are the pictures at once, in the admin's order: a first video's still is the cover.
  const images = useAi ? [] : photos;
  const submission = await prisma.submission.create({
    data: { sellerId: seller.id, status: 'COLLECTING', createdByAdmin: true, rawImages: photos, images, usesAi: useAi, type },
  });
  if (useAi && photos.length > 0) after(() => makeListingPictures(submission.id));
  return { success: true, message: 'La IA está haciendo las fotos', id: submission.id };
}

// The person's WhatsApp as digits; empty: none, buyers write through the Corral.
const sellerPhoneSchema = z
  .string()
  .transform((value) => value.replace(/\D/g, ''))
  .refine((digits) => digits === '' || (digits.length >= 9 && digits.length <= 15))
  .optional();

// A Spanish mobile without country code gets +34; no number is the house seller.
const toWaId = (digits?: string) => (digits ? (digits.length === 9 ? `34${digits}` : digits) : HOUSE_SELLER);

const descriptionSchema = z.object({
  notes: z.string().trim().max(2000),
  sellerPhone: sellerPhoneSchema,
  // 'original': the notes are the description as they are, only translated.
  textMode: z.enum(TEXT_MODES).default('ai'),
  originalTitle: z.string().trim().max(120).optional(),
});

export type ListingDescriptionInput = z.input<typeof descriptionSchema>;

/** Step 2: everything the admin knows about the item; the AI writes the listing from it and the pictures. */
export async function describeAdminListing(id: string, input: ListingDescriptionInput) {
  if (!(await isAdmin()) || !idSchema.safeParse(id).success) return NOT_ALLOWED;
  const parsed = descriptionSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: 'Revisa el teléfono' };
  const { notes, sellerPhone, textMode, originalTitle } = parsed.data;
  if (textMode === 'original' && !notes) return { success: false, message: 'Escribe tu texto para usarlo tal cual' };
  const listing = await prisma.submission.findUnique({ where: { id }, select: { rawImages: true, images: true, lastError: true } });
  // A video without a still counts as no photo: the AI makes the picture from the description.
  const hasPhoto = Boolean(listing?.rawImages.some(pictureOf));
  if (!hasPhoto && !notes) return { success: false, message: 'Sin foto, la IA necesita tu descripción para crearla' };
  // Without the person's number, buyers write through the Corral, services included. Their OK comes later, from them.
  const waId = toWaId(sellerPhone);
  const seller = await prisma.seller.upsert({ where: { waId }, update: {}, create: { waId } });
  // Also while the AI still makes the pictures: the text is written at the same time.
  const { count } = await prisma.submission.updateMany({
    where: { id, status: 'COLLECTING', createdByAdmin: true },
    data: {
      status: 'PROCESSING',
      rawText: notes,
      sellerId: seller.id,
      textMode,
      originalTitle: (textMode === 'original' && originalTitle) || null,
      lastError: null,
    },
  });
  if (count === 0) return { success: false, message: 'La IA ya está escribiendo este anuncio' };
  after(() => processSubmission(id));
  // Before the description only the pictures run, so an error then was theirs: they start again too.
  if (hasPhoto && listing?.lastError && listing.images.length === 0) after(() => makeListingPictures(id));
  return { success: true, message: 'La IA está escribiendo el anuncio' };
}

const idSchema = z.string().uuid();

/** What the listing page polls while the AI works. */
export async function getAdminListing(id: string) {
  if (!(await isAdmin()) || !idSchema.safeParse(id).success) return null;
  const submission = await prisma.submission.findUnique({
    where: { id },
    include: { seller: { select: { waId: true, name: true } }, product: { select: { slug: true } } },
  });
  if (!submission) return null;
  const { price, priceMax, ...rest } = submission;
  // The plan prices come along: the editor's "Pagado" starts from the chosen plan's price.
  return { ...rest, price: price?.toString() ?? null, priceMax: priceMax?.toString() ?? null, planPrices: LISTING_PRICES };
}

export type AdminListing = NonNullable<Awaited<ReturnType<typeof getAdminListing>>>;

const textSchema = z.object({ title: z.string().trim().max(120), description: z.string().trim().max(3000), short: z.string().trim().max(40).optional() });

const editSchema = z.object({
  title: z.string().trim().min(2).max(120),
  // Empty: the ring row shows the title.
  shortTitle: z.string().trim().max(40).transform((value) => value || null).optional(),
  description: z.string().trim().max(3000),
  // The other shop languages; the shop language's text is title and description.
  translations: z.record(z.string(), textSchema),
  category: z.string().trim().max(60),
  // Empty: the admin took the condition away.
  condition: z.union([z.enum(PRODUCT_CONDITIONS), z.literal('')]).transform((value) => value || null).optional(),
  // Empty: none (only a service may have none, then it shows no "from" price).
  price: z
    .union([z.string().regex(/^\d{1,6}([.,]\d{1,2})?$/), z.literal('')])
    .transform((value) => (value ? Number(value.replace(',', '.')).toFixed(2) : undefined))
    .optional(),
  // The upper end of a wanted ad's budget; empty: one amount, no range.
  priceMax: z
    .union([z.string().regex(/^\d{1,6}([.,]\d{1,2})?$/), z.literal('')])
    .transform((value) => (value ? Number(value.replace(',', '.')).toFixed(2) : null))
    .optional(),
  images: z.array(photoUrlSchema).min(1).max(12),
  // Only a service's kind of offer; empty: none.
  serviceType: z.union([z.enum(SERVICE_TYPES), z.literal('')]).transform((value) => value || null).optional(),
  // Only an event's start, as the island's clock shows it ("2026-11-29T19:00"), and its address.
  startsAt: z
    .string()
    .transform((value, context) => {
      const date = value ? fromShopDateTime(value) : null;
      if (value && !date) context.addIssue({ code: 'custom', message: 'Invalid date' });
      return date;
    })
    .optional(),
  address: z.string().trim().max(200).transform((value) => value || null).optional(),
  // Which of the two texts these title and description are.
  textMode: z.enum(TEXT_MODES).optional(),
  // Where it is; empty or missing in a shop without places.
  placeId: z
    .union([z.string().uuid(), z.literal('')])
    .transform((value) => value || undefined)
    .optional(),
  // Only before it goes live; missing: the number stays as it is.
  sellerPhone: sellerPhoneSchema,
});

export type ListingEdit = z.input<typeof editSchema>;

/** The person's number changed: a new seller, and the old number's consent no longer counts. */
async function sellerChange(current: { status: string; seller: { waId: string } } | null, sellerPhone?: string) {
  if (!current || sellerPhone === undefined) return {};
  const waId = toWaId(sellerPhone);
  if (waId === current.seller.waId) return {};
  if (current.status !== 'IN_REVIEW' && current.status !== 'AWAITING_PAYMENT') return null;
  const seller = await prisma.seller.upsert({ where: { waId }, update: {}, create: { waId } });
  return { sellerId: seller.id, hasContactConsent: false, consentAt: null, consentSource: null, consentTextVersion: null };
}

export async function updateAdminListing(id: string, input: ListingEdit) {
  if (!(await isAdmin()) || !idSchema.safeParse(id).success) return NOT_ALLOWED;
  if (!sellerPhoneSchema.safeParse(input.sellerPhone).success) return { success: false, message: 'Revisa el teléfono' };
  const parsed = editSchema.safeParse(input);
  const current = await prisma.submission.findUnique({
    where: { id },
    select: { translations: true, type: true, textMode: true, textVersions: true, status: true, seller: { select: { waId: true } } },
  });
  const isService = current?.type === 'SERVICE';
  const isWanted = current?.type === 'WANTED';
  if (!parsed.success || (!isService && !parsed.data.price)) return { success: false, message: 'Revisa el título, el precio y las fotos' };
  if (current?.type === 'EVENT' && !parsed.data.startsAt) return { success: false, message: 'Elige la fecha y la hora del evento' };
  const category = findCategory(await getListingCategories(), parsed.data.category);
  if (!category) return { success: false, message: 'Elige una de las categorías' };
  if (parsed.data.condition === ANY_CONDITION && !isWanted) return { success: false, message: 'Elige el estado del artículo' };
  if (parsed.data.placeId && !(await prisma.place.findUnique({ where: { id: parsed.data.placeId }, select: { id: true } }))) {
    return { success: false, message: 'Elige uno de los lugares' };
  }
  // Merged, so a language the editor doesn't show (e.g. one switched off for now) keeps its text.
  const translations = { ...(current?.translations as ListingTranslations), ...parsed.data.translations };
  const { textMode = current?.textMode as TextMode, sellerPhone, ...fields } = parsed.data;
  const sellerData = await sellerChange(current, sellerPhone);
  if (!sellerData) return { success: false, message: 'El WhatsApp solo se puede cambiar antes de publicar' };
  // A service's empty price takes its "from" price away; only a service has a kind of offer.
  const edit = isService ? { ...fields, price: fields.price ?? null } : { ...fields, serviceType: null };
  // Only a wanted ad has a range, and only one whose upper end is above its lower end.
  const priceMax = isWanted && edit.priceMax && Number(edit.priceMax) > Number(edit.price) ? edit.priceMax : null;
  const versions = (current?.textVersions ?? {}) as TextVersions;
  const editedVersion: ListingTexts = { ...translations, [getShopLocale()]: { title: edit.title, description: edit.description, short: edit.shortTitle ?? '' } };
  // A save that was still on its way when the admin switched texts only updates its own version, never the one in use.
  if (textMode !== current?.textMode) {
    await prisma.submission.update({ where: { id }, data: { ...sellerData, textVersions: { ...versions, [textMode]: editedVersion } } });
    return { success: true, message: 'Guardado' };
  }
  const submission = await prisma.submission.update({
    where: { id },
    data: { ...edit, ...sellerData, priceMax, translations, category: category.slug, textVersions: { ...versions, [textMode]: editedVersion } },
  });
  // A live listing's product follows the edit.
  if (submission.productId) {
    const { title, shortTitle, description, price, images, condition, placeId, serviceType, startsAt, address } = edit;
    await prisma.product.update({
      where: { id: submission.productId },
      data: {
        name: title,
        shortName: shortTitle,
        description,
        translations: toProductTranslations(translations),
        price: price ?? 0,
        serviceType,
        startsAt,
        address,
        priceMax,
        images,
        condition,
        placeId,
        category: categoryName(category, getShopLocale()),
        categories: { set: categoryRefs(category) },
      },
    });
    revalidatePath('/');
  }
  return { success: true, message: 'Guardado' };
}

const textModeSchema = z.enum(TEXT_MODES);

/** The shop's languages, its own first, as the AI writes them. */
const listingLocales = () => {
  const shopLocale = getShopLocale();
  return [shopLocale, ...getEnabledLocales().filter((locale) => locale !== shopLocale)];
};

/** Switches between the admin's own text and the AI's. A version made before comes back at once; a missing one is
    written now (AI) or translated now (original), once. The editor saves what it gets back. */
export async function chooseListingText(id: string, mode: TextMode) {
  if (!(await isAdmin()) || !idSchema.safeParse(id).success || !textModeSchema.safeParse(mode).success) return NOT_ALLOWED;
  const submission = await prisma.submission.findUnique({ where: { id } });
  if (!submission) return { success: false, message: 'Este anuncio ya no existe' };
  const versions = submission.textVersions as TextVersions;
  const [shopLocale, ...otherLocales] = listingLocales();
  let texts = versions[mode];
  try {
    if (!texts && mode === 'original') {
      if (!submission.rawText.trim()) return { success: false, message: 'No hay texto original' };
      const own = { title: submission.originalTitle || submission.title || '', description: submission.rawText, short: submission.shortTitle ?? '' };
      texts = { [shopLocale]: own, ...(await translateText(own, shopLocale, otherLocales)) };
    }
    if (!texts) {
      const photoUrl = submission.rawImages.map(pictureOf).find(Boolean);
      const photo = photoUrl ? await fetchImage(photoUrl) : null;
      const categories = await getListingCategories();
      texts = (await writeListing(photo, submission.rawText, categories, [shopLocale, ...otherLocales], submission.type)).texts;
    }
  } catch (error) {
    console.error(`Text of listing ${id} not made`, error);
    return { success: false, message: aiErrorText((await getT()).t, error) ?? 'La IA no pudo hacer el texto. Inténtalo otra vez.' };
  }
  await prisma.submission.update({ where: { id }, data: { textMode: mode, textVersions: { ...versions, [mode]: texts } } });
  return { success: true, message: '', texts };
}

/** The shop-language title and description translated again into every other language, after the admin changed them. */
export async function translateListingText(id: string, text: { title: string; description: string; short?: string }) {
  if (!(await isAdmin()) || !idSchema.safeParse(id).success) return NOT_ALLOWED;
  const parsed = textSchema.safeParse(text);
  if (!parsed.success) return { success: false, message: 'Revisa el título y la descripción' };
  const [shopLocale, ...otherLocales] = listingLocales();
  try {
    return { success: true, message: '', translations: await translateText(parsed.data, shopLocale, otherLocales) };
  } catch (error) {
    console.error(`Listing ${id} not translated`, error);
    return { success: false, message: aiErrorText((await getT()).t, error) ?? 'No se pudo traducir. Inténtalo otra vez.' };
  }
}

/** The category step: the admin confirms or changes what the AI recognized, also while it still makes the pictures. */
export async function setAdminListingCategory(id: string, slug: string) {
  if (!(await isAdmin()) || !idSchema.safeParse(id).success) return NOT_ALLOWED;
  const category = findCategory(await getListingCategories(), slug);
  if (!category) return { success: false, message: 'Elige una de las categorías' };
  const submission = await prisma.submission.update({ where: { id }, data: { category: category.slug } });
  if (submission.productId) {
    await prisma.product.update({
      where: { id: submission.productId },
      data: { category: categoryName(category, getShopLocale()), categories: { set: categoryRefs(category) } },
    });
    revalidatePath('/');
  }
  return { success: true, message: 'Guardado' };
}

const picturePromptSchema = z.string().trim().max(500).optional();

/** One more picture made by the AI, from what the admin typed or else the listing's own text. The editor adds it and saves. */
export async function createAdminListingPicture(id: string, prompt?: string) {
  if (!(await isAdmin()) || !idSchema.safeParse(id).success) return NOT_ALLOWED;
  const parsed = picturePromptSchema.safeParse(prompt);
  if (!parsed.success) return { success: false, message: 'Describe la foto en menos palabras' };
  const submission = await prisma.submission.findUnique({ where: { id }, select: { title: true, description: true, type: true } });
  if (!submission) return { success: false, message: 'Este anuncio ya no existe' };
  const text = parsed.data ? { title: parsed.data, description: '' } : { title: submission.title ?? '', description: submission.description ?? '' };
  if (!text.title && !text.description) return { success: false, message: 'Describe la foto que quieres' };
  try {
    const picture = await createPicture(text, submission.type);
    return { success: true, message: '', url: await uploadImage(picture, `listing-${id}-extra`) };
  } catch (error) {
    console.error(`Picture of listing ${id} not made`, error);
    return { success: false, message: aiErrorText((await getT()).t, error) ?? 'La IA no pudo crear la foto. Inténtalo otra vez.' };
  }
}

/** The addresses an event's address field suggests, loaded once when the editor opens: around the listing's corral town. */
export async function findAddresses(placeId: string) {
  if (!(await isAdmin())) return { ...NOT_ALLOWED, addresses: [] };
  const place = idSchema.safeParse(placeId).success ? await prisma.place.findUnique({ where: { id: placeId }, select: { slug: true } }) : null;
  return { success: true, message: '', addresses: await loadAddresses(place?.slug) };
}

const planSchema = z.enum(['normal', 'big']);

/** "Publicar ahora": online at once, without payment. */
export async function publishAdminListing(id: string, plan: 'normal' | 'big') {
  if (!(await isAdmin()) || !idSchema.safeParse(id).success || !planSchema.safeParse(plan).success) return NOT_ALLOWED;
  // An event goes online only with its date (a database rule too).
  const listing = await prisma.submission.findUnique({ where: { id }, select: { type: true, startsAt: true, consentAt: true, seller: { select: { waId: true } } } });
  if (listing?.type === 'EVENT' && !listing.startsAt) return { success: false, message: 'Elige la fecha y la hora del evento' };
  // The person's number only goes online with their recorded OK (on their page, or "SÍ" on WhatsApp).
  if (listing?.seller && lacksConsent(listing)) return { success: false, message: 'Falta su permiso para mostrar su número' };
  const product = await publishByAdmin(id, plan);
  return product
    ? { success: true, message: 'Anuncio online', slug: product.slug }
    : { success: false, message: 'Este anuncio ya no se puede publicar' };
}

/**
 * "Enviar por WhatsApp": the person gets their private link to see the listing, choose a plan and pay. Opened in the
 * admin's own WhatsApp (wa.me), not sent by the Cloud API, which refuses a message outside the 24-hour window.
 */
export async function shareAdminListing(id: string) {
  if (!(await isAdmin()) || !idSchema.safeParse(id).success) return NOT_ALLOWED;
  const listing = await prisma.submission.findFirst({
    where: { id, status: { in: ['IN_REVIEW', 'AWAITING_PAYMENT'] } },
    select: { payToken: true, seller: { select: { waId: true } } },
  });
  if (!listing) return { success: false, message: 'Este anuncio ya no se puede enviar' };
  const { waId } = listing.seller;
  if (waId === HOUSE_SELLER) return { success: false, message: 'Este anuncio no tiene el WhatsApp de la persona' };
  // The private page only opens for a listing waiting for payment; its 48 hours start now.
  if (!(await markSent(id))) return { success: false, message: 'Este anuncio ya no se puede enviar' };
  const message = botText(localeOf(waId), 'approved', { url: publishUrl(listing.payToken), hours: UNPAID_LISTING_HOURS });
  // Straight to api.whatsapp.com: the wa.me redirect turns emoji like 👋 into "�".
  return { success: true, message: '', url: `https://api.whatsapp.com/send?phone=${waId}&text=${encodeURIComponent(message)}` };
}

export async function rejectAdminListing(id: string) {
  if (!(await isAdmin()) || !idSchema.safeParse(id).success) return NOT_ALLOWED;
  const rejected = await rejectSubmission(id);
  return rejected ? { success: true, message: 'Anuncio rechazado' } : { success: false, message: 'Ya no está pendiente de revisión' };
}

/** "Activar de nuevo": an expired listing comes back with its pictures and texts. */
export async function enableAdminListing(id: string) {
  if (!(await isAdmin()) || !idSchema.safeParse(id).success) return NOT_ALLOWED;
  const outcome = await enableListing(id);
  if (!outcome) return { success: false, message: 'Este anuncio ya no está caducado' };
  return { success: true, message: outcome === 'live' ? 'Anuncio online de nuevo' : 'Esperando el pago de nuevo' };
}

export async function markAdminListingSold(id: string) {
  if (!(await isAdmin()) || !idSchema.safeParse(id).success) return NOT_ALLOWED;
  await takeDown(id, 'SOLD');
  return { success: true, message: 'Marcado como vendido' };
}

/** Removes a listing for good: its product leaves the shop and the listing leaves Anuncios. */
export async function deleteAdminListing(id: string) {
  if (!(await isAdmin()) || !idSchema.safeParse(id).success) return NOT_ALLOWED;
  const submission = await prisma.submission.findUnique({ where: { id }, select: { productId: true } });
  if (!submission) return { success: false, message: 'Este anuncio ya no existe' };
  try {
    await prisma.$transaction([
      ...(submission.productId ? [prisma.product.delete({ where: { id: submission.productId } })] : []),
      prisma.submission.delete({ where: { id } }),
    ]);
  } catch (error) {
    // E.g. a product that is already in an order can't be removed.
    console.error(`Listing ${id} not deleted`, error);
    return { success: false, message: 'No se pudo eliminar este anuncio' };
  }
  revalidatePath('/', 'layout');
  return { success: true, message: 'Anuncio eliminado' };
}

/** The AI failed: start the work again from where it stopped. */
export async function retryAdminListing(id: string) {
  if (!(await isAdmin()) || !idSchema.safeParse(id).success) return NOT_ALLOWED;
  const submission = await prisma.submission.findUnique({ where: { id }, select: { status: true, images: true, rawImages: true, usesAi: true, createdByAdmin: true } });
  // Still on the photos step: only the pictures are tried again.
  if (submission?.status === 'COLLECTING') {
    await prisma.submission.update({ where: { id }, data: { attempts: 0, lastError: null } });
    after(() => makeListingPictures(id));
  } else {
    await prisma.submission.update({ where: { id }, data: { status: 'PROCESSING', attempts: 0, lastError: null } });
    after(() => processSubmission(id));
    // Pictures from the upload still missing: their own run starts again, as processSubmission leaves them to it.
    if (submission?.createdByAdmin && submission.usesAi && submission.images.length === 0 && submission.rawImages.some(pictureOf)) after(() => makeListingPictures(id));
  }
  return { success: true, message: 'La IA lo intenta otra vez' };
}
