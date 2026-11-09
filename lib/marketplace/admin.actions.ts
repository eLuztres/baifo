'use server';

import { after } from 'next/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/db/prisma';
import { isAdmin } from '@/lib/auth-guard';
import { LISTING_TYPES, MAX_LISTING_TAGS, PRICE_MODES } from '@/lib/constants';
import { MAX_TAG_LENGTH, type TagNames } from '@/lib/tag-names';
import { saveEditorTag } from '@/lib/tags';
import { fromShopDateTime, toShopDateTime } from '@/lib/event-date';
import { getEnabledLocales, getShopLocale, getT } from '@/lib/i18n-server';
import { LOCALES, type Locale } from '@/lib/i18n-core';
import { aiErrorText } from '@/lib/ai-errors';
import { listingContactsSchema, sellerNameSchema, sellerPhoneSchema } from '@/lib/validators';
import { isVideoUrl, mediaUrl, pictureOf, videoSource } from '@/lib/video';
import { toProductTranslations, type ListingTranslations } from './catalog';
import { correctText, createPicture, enhancePhoto, translateText, writeListing } from './ai';
import { getDefaultPlaceId } from '@/lib/places';
import { loadAddresses } from './address-search';
import { HOUSE_SELLER, LISTING_PRICES, publishUrl, UNPAID_LISTING_HOURS } from './config';
import { botText, localeOf } from './messages';
import { hasContactExtra } from './contact-ways';
import { toWaId } from './seller';
import { moveListingToNumber } from './seller-number';
import { fetchImage, uploadImage } from './media';
import { TEXT_MODES, type ListingTexts, type TextMode, type TextVersions } from './text-versions';
import { makeListingPictures, processSubmission, writeDraftText } from './processing';
import { lacksConsent, markSent, recordConsent } from './listing-payment';
import { enableListing, publishByAdmin, takeDown } from './publish';
import { pictureCounterpart } from './pictures';
import { takeVideoStill } from './video-cleanup';
import { PICTURE_MOTIONS } from '@/lib/picture-motion';

// Server actions are public endpoints: every one checks for an admin itself.
const NOT_ALLOWED = { success: false, message: 'Solo para administradores' } as const;

// Only photos uploaded through UploadThing, so the server never fetches an arbitrary URL.
const photoUrlSchema = z.string().refine((value) => {
  if (!URL.canParse(value)) return false;
  const { protocol, hostname } = new URL(value);
  return protocol === 'https:' && (hostname === 'utfs.io' || hostname.endsWith('.ufs.sh'));
});

/** "Nuevo anuncio" opens an empty draft at once, so photos, description and contact can be filled in any order.
    Drafts stay COLLECTING, which the listings page doesn't show. */
export async function startAdminListing(type: unknown) {
  if (!(await isAdmin())) return NOT_ALLOWED;
  const parsed = z.enum(LISTING_TYPES).safeParse(type);
  if (!parsed.success) return { success: false, message: 'Elige el tipo' };
  const seller = await prisma.seller.upsert({ where: { waId: HOUSE_SELLER }, update: {}, create: { waId: HOUSE_SELLER } });
  // The shop's first live place for now; later the Corral of the admin who creates it.
  const submission = await prisma.submission.create({
    data: { sellerId: seller.id, status: 'COLLECTING', createdByAdmin: true, type: parsed.data, usesAi: false, placeId: await getDefaultPlaceId() },
  });
  return { success: true, message: '', id: submission.id };
}

// The picture tabs as stored: the uploads with their AI version at the same index, and the pictures in use, in order.
const picturesSchema = z
  .object({
    images: z.array(photoUrlSchema).max(12),
    rawImages: z.array(photoUrlSchema).max(12),
    aiImages: z.array(z.union([photoUrlSchema, z.literal('')])).max(12),
  })
  .refine(({ rawImages, aiImages }) => rawImages.length === aiImages.length);

/** Every change in the picture tabs is saved at once, so leaving for the description keeps it. */
export async function saveAdminListingPictures(id: string, input: z.input<typeof picturesSchema>) {
  if (!(await isAdmin()) || !idSchema.safeParse(id).success) return NOT_ALLOWED;
  const parsed = picturesSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: 'Revisa las fotos' };
  // A new listing or one being edited, never while the AI writes it; an online one shows the new pictures at once.
  const { count } = await prisma.submission.updateMany({
    where: { id, status: { not: 'PROCESSING' } },
    data: { ...parsed.data, lastError: null },
  });
  if (count === 0) return { success: false, message: 'La IA ya está escribiendo este anuncio' };
  const { productId } = (await prisma.submission.findUnique({ where: { id }, select: { productId: true } })) ?? {};
  if (productId && parsed.data.images.length > 0) {
    await prisma.product.update({ where: { id: productId }, data: { images: parsed.data.images } });
    revalidatePath('/');
  }
  return { success: true, message: 'Fotos guardadas' };
}

// An amount as typed ("12", "12,50"); empty: none.
const amountSchema = z
  .union([z.string().regex(/^\d{1,6}([.,]\d{1,2})?$/), z.literal('')])
  .transform((value) => (value ? Number(value.replace(',', '.')).toFixed(2) : undefined))
  .optional();
const listingTextSchema = z.object({ title: z.string().trim().min(1).max(120), description: z.string().trim().max(3000), short: z.string().trim().max(40).optional() });

// An event's start as the island's clock shows it ("2026-11-29T19:00"); empty: not set.
const eventStartSchema = z
  .string()
  .transform((value, context) => {
    const date = value ? fromShopDateTime(value) : null;
    if (value && !date) context.addIssue({ code: 'custom', message: 'Invalid date' });
    return date;
  })
  .optional();
const eventAddressSchema = z.string().trim().max(200).transform((value) => value || null).optional();
// Empty: in no Mercadillo; missing: they stay as they are.
const mercadilloIdsSchema = z.array(z.string().uuid()).max(50).optional();
// Empty: no señalador; missing: it stays as it is.
const scoutIdSchema = z
  .union([z.string().uuid(), z.literal('')])
  .transform((value) => value || null)
  .optional();
// As the admin left them: existing ones by id, new ones by their names; missing: they stay as they are.
const tagsSchema = z
  .array(
    z.object({
      id: z.string().uuid().optional(),
      names: z.record(z.enum(LOCALES.map((option) => option.id) as [Locale, ...Locale[]]), z.string().max(MAX_TAG_LENGTH)),
    })
  )
  .max(MAX_LISTING_TAGS)
  .optional();
const scoutExists = async (id: string) => Boolean(await prisma.scout.findUnique({ where: { id }, select: { id: true } }));
const mercadillosExist = async (ids: string[]) => (await prisma.mercadillo.count({ where: { id: { in: ids } } })) === new Set(ids).size;
// The whole set, replacing the ones before.
const setMercadillos = (ids: string[]) => ({ set: ids.map((id) => ({ id })) });

// New etiquetas are made first; existing ones only gain the names they lacked (what "Traducir" filled in).
const setListingTags = async (id: string, tags: z.output<typeof tagsSchema> & object) => {
  const saved = (await Promise.all(tags.map((tag) => saveEditorTag(tag as { id?: string; names: TagNames })))).filter((tag) => tag !== null);
  await prisma.submission.update({ where: { id }, data: { tags: { set: saved } } });
};

const draftSchema = z.object({
  notes: z.string().trim().min(1).max(3000),
  title: z.string().trim().max(120).optional(),
  // The tab the admin wrote in: the base every other language is made from.
  language: z.enum(LOCALES.map((option) => option.id) as [Locale, ...Locale[]]).optional(),
  textMode: z.enum(TEXT_MODES),
  isWanted: z.boolean().optional(),
  priceMode: z.enum(PRICE_MODES).optional(),
  price: amountSchema,
  // An event's own date and place win; empty ones the AI reads from the words.
  startsAt: eventStartSchema,
  address: eventAddressSchema,
});

/** "Crear descripción": the AI writes title and description in every language from the admin's words in one language
    (improved, corrected or only translated) and reads one existing etiqueta and, unless the admin set one,
    the price. Nothing goes online. */
export async function draftAdminListingText(id: string, input: z.input<typeof draftSchema>) {
  if (!(await isAdmin()) || !idSchema.safeParse(id).success) return NOT_ALLOWED;
  const parsed = draftSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: 'Escribe la descripción' };
  const { notes, title, language, textMode, isWanted, priceMode, price, startsAt, address } = parsed.data;
  const current = await prisma.submission.findUnique({ where: { id }, select: { type: true } });
  if (!current) return NOT_ALLOWED;
  const type = current.type === 'EVENT' ? 'EVENT' : isWanted ? 'WANTED' : 'PRODUCT';
  // A price the admin set wins; without one the AI reads it from the words.
  const hasOwnPrice = priceMode === 'NONE' || Boolean(price);
  const { count } = await prisma.submission.updateMany({
    where: { id, status: { not: 'PROCESSING' } },
    data: {
      rawText: notes,
      textMode,
      originalTitle: title || null,
      type,
      price: hasOwnPrice ? (price ?? null) : null,
      priceMode: hasOwnPrice ? priceMode : null,
      startsAt: type === 'EVENT' ? (startsAt ?? null) : null,
      address: type === 'EVENT' ? (address ?? null) : null,
    },
  });
  if (count === 0) return { success: false, message: 'La IA ya está escribiendo este anuncio' };
  try {
    const base = language && getEnabledLocales().includes(language) ? language : undefined;
    // The AI picks by name in the language it writes from; the editor gets the etiqueta's id back.
    const tags = (await prisma.tag.findMany({ select: { id: true, names: true } })).map((tag) => ({ id: tag.id, name: (tag.names as TagNames)[base ?? getShopLocale()] }));
    const named = tags.filter((tag): tag is { id: string; name: string } => Boolean(tag.name));
    const written = await writeDraftText(id, { base, tags: named.map((tag) => tag.name) });
    if (!written?.title) return { success: false, message: 'La IA no pudo escribir la descripción. Inténtalo otra vez.' };
    const texts: ListingTexts = {
      ...(written.translations as ListingTexts),
      [getShopLocale()]: { title: written.title, description: written.description ?? '', short: written.shortTitle ?? '' },
    };
    return {
      success: true,
      message: '',
      texts,
      type: written.type,
      priceMode: written.priceMode,
      price: written.price?.toString() ?? null,
      startsAt: written.startsAt ? toShopDateTime(written.startsAt) : null,
      address: written.address,
      tag: named.find((tag) => tag.name === written.tag)?.id ?? null,
    };
  } catch (error) {
    console.error(`Text of listing ${id} not written`, error);
    return { success: false, message: aiErrorText((await getT()).t, error) ?? 'La IA no pudo escribir la descripción. Inténtalo otra vez.' };
  }
}

const CHECK_CONTACTS = 'Revisa el email, la web o el Instagram';

const contactFields = ({ email, web, instagram }: z.output<typeof listingContactsSchema>) => ({ contactEmail: email, contactWeb: web, contactInstagram: instagram });

const descriptionSchema = z.object({
  notes: z.string().trim().max(3000),
  sellerPhone: sellerPhoneSchema.optional(),
  // The name on this listing only, checked like on their own page; empty: none.
  sellerName: sellerNameSchema.optional(),
  contacts: listingContactsSchema.optional(),
  // 'original': the notes are the description as they are, only translated; 'corrected': the same with their mistakes fixed.
  textMode: z.enum(TEXT_MODES).default('ai'),
  originalTitle: z.string().trim().max(120).optional(),
  // The admin confirms the person agreed to show their number: it goes online by itself once the AI is done.
  hasConsent: z.boolean().default(false),
  // "Ofrezco | Busco" on an Anuncio: Busco makes it a wanted ad, Ofrezco never one. Missing (an event): the type stays.
  isWanted: z.boolean().optional(),
  // The texts made by "Crear descripción", as the admin edited them, in every language.
  texts: z.record(z.string(), listingTextSchema).optional(),
  priceMode: z.enum(PRICE_MODES).optional(),
  price: amountSchema,
  startsAt: eventStartSchema,
  address: eventAddressSchema,
  mercadilloIds: mercadilloIdsSchema,
  scoutId: scoutIdSchema,
  tags: tagsSchema,
  pictureMotion: z.enum(PICTURE_MOTIONS).optional(),
  // "Más": Oculto keeps it ready instead of online; "Online hasta" is the last day it shows (YYYY-MM-DD), an event's is its day.
  isHidden: z.boolean().default(false),
  onlineUntil: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export type ListingDescriptionInput = z.input<typeof descriptionSchema>;

const TEXT_FIELD_NAMES: Record<string, string> = { title: 'el título', description: 'la descripción', short: 'el título corto' };

/** What "Publicar" says when a field fails: the field itself, so the admin knows what to change. */
const describeIssueMessage = (issue: z.ZodIssue | undefined) => {
  const [field, language, textField] = issue?.path ?? [];
  const tooLong = issue?.code === 'too_big' && 'maximum' in issue ? ` (máximo ${issue.maximum} caracteres)` : '';
  switch (field) {
    case 'tags':
      return `Como mucho ${MAX_LISTING_TAGS} etiquetas`;
    case 'contacts':
      return CHECK_CONTACTS;
    case 'sellerName':
      return 'Revisa el nombre';
    case 'sellerPhone':
      return 'Revisa el teléfono';
    case 'notes':
      return `La descripción es demasiado larga${tooLong}`;
    case 'texts': {
      const languageName = LOCALES.find((option) => option.id === language)?.label ?? String(language);
      const name = TEXT_FIELD_NAMES[String(textField)] ?? 'el texto';
      return tooLong ? `Acorta ${name} en ${languageName}${tooLong}` : `Revisa ${name} en ${languageName}`;
    }
    case 'price':
      return 'Revisa el precio: solo números, por ejemplo 80 o 12,50';
    case 'startsAt':
      return 'Revisa la fecha y la hora del evento';
    case 'onlineUntil':
      return 'Revisa el día de «Online hasta»';
    default:
      return `Revisa ${String(field ?? 'el anuncio')}`;
  }
};

/** "Publicar": the AI writes the listing from the description (as the admin chose) and it goes online once it is done.
    A picture, the description, a way to reach the person (WhatsApp, email, web or Instagram) and their OK to show it are needed. */
export async function describeAdminListing(id: string, input: ListingDescriptionInput) {
  if (!(await isAdmin()) || !idSchema.safeParse(id).success) return NOT_ALLOWED;
  const parsed = descriptionSchema.safeParse(input);
  if (!parsed.success) {
    // Only where and why, never the values: the logs show which field stopped a listing.
    console.warn(`Listing ${id} not published:`, parsed.error.issues.map((issue) => `${issue.path.join('.')} ${issue.code}`).join(', '));
    return { success: false, message: describeIssueMessage(parsed.error.issues[0]) };
  }
  const { notes, sellerPhone, sellerName, contacts, textMode, originalTitle, hasConsent, isWanted, texts, priceMode, price, startsAt, address, isHidden, onlineUntil, mercadilloIds, scoutId, tags, pictureMotion } =
    parsed.data;
  // Buyers write to the person directly: "through the Corral" is parked for now (#131). WhatsApp is one way of several.
  if (!sellerPhone && !hasContactExtra(contacts)) return { success: false, message: 'Escribe su WhatsApp u otra forma de contacto' };
  if (!hasConsent) return { success: false, message: 'Falta su permiso para mostrar su contacto' };
  const listing = await prisma.submission.findUnique({ where: { id }, select: { rawImages: true, images: true, lastError: true, type: true } });
  // Published only with a title and description in every shop language: the AI's or the admin's own.
  const shopLocale = getShopLocale();
  const own = texts?.[shopLocale];
  if (!listing || !own || listingLocales().some((locale) => !texts?.[locale]?.title || !texts[locale]?.description)) {
    return { success: false, message: 'Faltan el título y la descripción en algún idioma' };
  }
  // An event goes online only with its date (a database rule too).
  const isEvent = listing.type === 'EVENT';
  if (isEvent && !startsAt) return { success: false, message: 'Elige la fecha y la hora del evento' };
  if (mercadilloIds && !(await mercadillosExist(mercadilloIds))) return { success: false, message: 'Elige uno de los mercadillos' };
  if (scoutId && !(await scoutExists(scoutId))) return { success: false, message: 'Elige uno de los señaladores' };
  // Through the whole last day on the island's clock.
  const endsAt = !isEvent && onlineUntil ? fromShopDateTime(`${onlineUntil}T23:59`) : null;
  if (endsAt && endsAt.getTime() <= Date.now()) return { success: false, message: 'Elige un día de hoy en adelante' };
  // A video without a still counts as no photo; a picture made from words counts.
  const hasPhoto = Boolean(listing?.rawImages.some(pictureOf));
  if (!hasPhoto && !listing?.images?.length) return { success: false, message: 'Sube o crea al menos una foto' };
  // Their OK to show the number comes later, from them. Without a number the listing stays the house's, with its other contacts.
  const waId = toWaId(sellerPhone);
  const seller = await prisma.seller.upsert({ where: { waId }, update: {}, create: { waId } });
  // Also while the AI still makes the pictures: the text is written at the same time.
  const { count } = await prisma.submission.updateMany({
    where: { id, status: 'COLLECTING', createdByAdmin: true },
    data: {
      status: 'PROCESSING',
      rawText: notes,
      ...(isWanted !== undefined && listing?.type !== 'EVENT' && { type: isWanted ? 'WANTED' : 'PRODUCT' }),
      // The texts as the admin left them: the AI doesn't write them again.
      title: own.title,
      description: own.description,
      shortTitle: own.short || null,
      translations: Object.fromEntries(Object.entries(texts).filter(([locale]) => locale !== shopLocale)),
      // The price is optional: a kind of price without an amount is no price.
      ...(priceMode && { priceMode: price && priceMode !== 'NONE' ? priceMode : 'NONE', price: priceMode === 'NONE' ? null : (price ?? null) }),
      ...(isEvent && { startsAt, address: address ?? null }),
      scoutId,
      pictureMotion,
      autoPublish: !isHidden,
      ...(endsAt && { expiresAt: endsAt }),
      sellerId: seller.id,
      sellerName,
      ...(contacts && contactFields(contacts)),
      textMode,
      originalTitle: (textMode !== 'ai' && originalTitle) || null,
      lastError: null,
    },
  });
  if (count === 0) return { success: false, message: 'La IA ya está escribiendo este anuncio' };
  if (tags) await setListingTags(id, tags);
  // A link between tables can't go through updateMany: set here, before the run that publishes it.
  if (mercadilloIds) await prisma.submission.update({ where: { id }, data: { mercadillos: setMercadillos(mercadilloIds) } });
  await recordConsent({ id }, 'admin-confirmed');
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
    include: { seller: { select: { waId: true, name: true } }, product: { select: { slug: true } }, tags: { select: { id: true, names: true } }, mercadillos: { select: { id: true } } },
  });
  if (!submission) return null;
  const { price, tags, mercadillos, ...rest } = submission;
  // The plan prices come along: the editor's "Pagado" starts from the chosen plan's price.
  return { ...rest, price: price?.toString() ?? null, planPrices: LISTING_PRICES, tags: tags.map((tag) => ({ id: tag.id, names: tag.names as TagNames })), mercadilloIds: mercadillos.map((mercadillo) => mercadillo.id) };
}

export type AdminListing = NonNullable<Awaited<ReturnType<typeof getAdminListing>>>;

const textSchema = z.object({ title: z.string().trim().max(120), description: z.string().trim().max(3000), short: z.string().trim().max(40).optional() });

const editSchema = z.object({
  // The type can change any time; none: it stays as it is.
  type: z.enum(LISTING_TYPES).optional(),
  title: z.string().trim().min(2).max(120),
  // Empty: the ring row shows the title.
  shortTitle: z.string().trim().max(40).transform((value) => value || null).optional(),
  description: z.string().trim().max(3000),
  // The other shop languages; the shop language's text is title and description.
  translations: z.record(z.string(), textSchema),
  // How the price reads; an event always has a set entry (0: free).
  priceMode: z.enum(PRICE_MODES).optional(),
  // Empty: none, only right with "no price".
  price: z
    .union([z.string().regex(/^\d{1,6}([.,]\d{1,2})?$/), z.literal('')])
    .transform((value) => (value ? Number(value.replace(',', '.')).toFixed(2) : undefined))
    .optional(),
  images: z.array(photoUrlSchema).min(1).max(12),
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
  mercadilloIds: mercadilloIdsSchema,
  scoutId: scoutIdSchema,
  tags: tagsSchema,
  pictureMotion: z.enum(PICTURE_MOTIONS).optional(),
  // The person's WhatsApp, checked like on their own page; missing: the number stays as it is.
  sellerPhone: sellerPhoneSchema.optional(),
  // This listing's name; missing: it stays as it is.
  sellerName: sellerNameSchema.optional(),
  // The email, web page and Instagram; missing: they stay as they are.
  contacts: listingContactsSchema.optional(),
  // The admin confirms the person's OK to show their number.
  hasConsent: z.boolean().optional(),
});

export type ListingEdit = z.input<typeof editSchema>;

export async function updateAdminListing(id: string, input: ListingEdit) {
  if (!(await isAdmin()) || !idSchema.safeParse(id).success) return NOT_ALLOWED;
  const parsed = editSchema.safeParse(input);
  const current = await prisma.submission.findUnique({
    where: { id },
    select: { translations: true, type: true, textMode: true, textVersions: true, productId: true, hasContactConsent: true, seller: { select: { waId: true, name: true } } },
  });
  if (!parsed.success && parsed.error.issues.some((issue) => issue.path[0] === 'sellerPhone')) return { success: false, message: 'Revisa el teléfono' };
  if (!parsed.success && parsed.error.issues.some((issue) => issue.path[0] === 'sellerName')) return { success: false, message: 'Revisa el nombre' };
  if (!parsed.success && parsed.error.issues.some((issue) => issue.path[0] === 'contacts')) return { success: false, message: CHECK_CONTACTS };
  // Everything is checked for the type it is saved as.
  const type = (parsed.success && parsed.data.type) || current?.type;
  const isService = type === 'SERVICE';
  const isEvent = type === 'EVENT';
  const priceMode = isEvent ? 'FIXED' : ((parsed.success && parsed.data.priceMode) || 'FIXED');
  if (!parsed.success && parsed.error.issues.some((issue) => issue.path[0] === 'tags')) return { success: false, message: `Como mucho ${MAX_LISTING_TAGS} etiquetas` };
  if (!parsed.success) return { success: false, message: 'Revisa el título, el precio y las fotos' };
  if (priceMode !== 'NONE' && !parsed.data.price) return { success: false, message: 'Escribe el precio o elige «Sin precio»' };
  if (isEvent && !parsed.data.startsAt) return { success: false, message: 'Elige la fecha y la hora del evento' };
  if (parsed.data.placeId && !(await prisma.place.findUnique({ where: { id: parsed.data.placeId }, select: { id: true } }))) {
    return { success: false, message: 'Elige uno de los lugares' };
  }
  if (parsed.data.mercadilloIds && !(await mercadillosExist(parsed.data.mercadilloIds))) return { success: false, message: 'Elige uno de los mercadillos' };
  if (parsed.data.scoutId && !(await scoutExists(parsed.data.scoutId))) return { success: false, message: 'Elige uno de los señaladores' };
  // Merged, so a language the editor doesn't show (e.g. one switched off for now) keeps its text.
  const translations = { ...(current?.translations as ListingTranslations), ...parsed.data.translations };
  const { textMode = current?.textMode as TextMode, sellerPhone, sellerName, contacts, hasConsent, tags, mercadilloIds, ...fields } = parsed.data;
  const newWaId = sellerPhone === undefined ? undefined : toWaId(sellerPhone);
  // A person's listing keeps a way to reach them: a number, or else an email, web or Instagram. The house's own may have none.
  if (newWaId === HOUSE_SELLER && current?.seller.waId !== HOUSE_SELLER && !hasContactExtra(contacts)) {
    return { success: false, message: 'Escribe su WhatsApp u otra forma de contacto' };
  }
  if (current && newWaId && newWaId !== current.seller.waId) await moveListingToNumber({ id, ...current }, newWaId);
  if (hasConsent) await recordConsent({ id }, 'admin-confirmed');
  if (tags) {
    await setListingTags(id, tags);
    revalidatePath('/admin/etiquetas');
  }
  // "No price" keeps no amount; an older service's kind of offer stays only while it is a service, an event's date and address only on an event.
  const edit = {
    ...fields,
    priceMode,
    price: priceMode === 'NONE' ? null : (fields.price ?? null),
    serviceType: isService ? undefined : null,
    startsAt: isEvent ? fields.startsAt : null,
    address: isEvent ? fields.address : null,
    ...(sellerName !== undefined && { sellerName }),
    ...(contacts && contactFields(contacts)),
  };
  const versions = (current?.textVersions ?? {}) as TextVersions;
  const editedVersion: ListingTexts = { ...translations, [getShopLocale()]: { title: edit.title, description: edit.description, short: edit.shortTitle ?? '' } };
  // A save that was still on its way when the admin switched texts only updates its own version, never the one in use.
  if (textMode !== current?.textMode) {
    await prisma.submission.update({ where: { id }, data: { textVersions: { ...versions, [textMode]: editedVersion } } });
    return { success: true, message: 'Guardado' };
  }
  const submission = await prisma.submission.update({
    where: { id },
    data: { ...edit, ...(mercadilloIds && { mercadillos: setMercadillos(mercadilloIds) }), translations, textVersions: { ...versions, [textMode]: editedVersion } },
  });
  // A live listing's product follows the edit.
  if (submission.productId) {
    const { title, shortTitle, description, price, images, placeId, pictureMotion, serviceType, startsAt, address } = edit;
    await prisma.product.update({
      where: { id: submission.productId },
      data: {
        name: title,
        shortName: shortTitle,
        description,
        translations: toProductTranslations(translations),
        price: price ?? 0,
        // Badges, "sold" words and filters follow the new type.
        type: submission.type,
        serviceType,
        startsAt,
        address,
        priceMode,
        images,
        placeId,
        ...(mercadilloIds && { mercadillos: setMercadillos(mercadilloIds) }),
        pictureMotion,
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

/** Switches between the admin's own text, the same corrected, and the AI's. A version made before comes back at once; a
    missing one is written now (AI), corrected and translated now (corrected) or translated now (original), once. The
    editor saves what it gets back. */
export async function chooseListingText(id: string, mode: TextMode) {
  if (!(await isAdmin()) || !idSchema.safeParse(id).success || !textModeSchema.safeParse(mode).success) return NOT_ALLOWED;
  const submission = await prisma.submission.findUnique({ where: { id } });
  if (!submission) return { success: false, message: 'Este anuncio ya no existe' };
  const versions = submission.textVersions as TextVersions;
  const [shopLocale, ...otherLocales] = listingLocales();
  let texts = versions[mode];
  try {
    if (!texts && mode !== 'ai') {
      if (!submission.rawText.trim()) return { success: false, message: 'No hay texto original' };
      const own = { title: submission.originalTitle || submission.title || '', description: submission.rawText, short: submission.shortTitle ?? '' };
      texts =
        mode === 'corrected' ? await correctText(own, shopLocale, otherLocales) : { [shopLocale]: own, ...(await translateText(own, shopLocale, otherLocales)) };
    }
    if (!texts) {
      const photoUrl = submission.rawImages.map(pictureOf).find(Boolean);
      const photo = photoUrl ? await fetchImage(photoUrl) : null;
      texts = (await writeListing(photo, submission.rawText, [shopLocale, ...otherLocales], submission.type)).texts;
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

const picturePromptSchema = z.string().trim().max(500).optional();

/** One more picture made by the AI: from the admin's idea, else their uploaded photo improved. Never from the description:
    with neither there is nothing to make it from. The editor adds it and saves. */
export async function createAdminListingPicture(id: string, prompt?: string, photo?: string) {
  if (!(await isAdmin()) || !idSchema.safeParse(id).success) return NOT_ALLOWED;
  const parsed = picturePromptSchema.safeParse(prompt);
  if (!parsed.success) return { success: false, message: 'Describe la foto en menos palabras' };
  // A picture tab's own photo, changed with the words on top; only an uploaded photo is ever fetched.
  if (photo !== undefined && !photoUrlSchema.safeParse(photo).success) return { success: false, message: 'Revisa las fotos' };
  const submission = await prisma.submission.findUnique({ where: { id }, select: { type: true, rawImages: true } });
  if (!submission) return { success: false, message: 'Este anuncio ya no existe' };
  const photoUrl = photo ?? submission.rawImages.map(pictureOf).find(Boolean);
  if (!parsed.data && !photoUrl) return { success: false, message: 'Escribe primero tu idea o sube una foto' };
  try {
    const picture =
      photo || !parsed.data
        ? await enhancePhoto(await fetchImage(photoUrl!), submission.type, parsed.data)
        : await createPicture({ title: parsed.data, description: '' }, submission.type);
    return { success: true, message: '', url: await uploadImage(picture, `listing-${id}-extra`) };
  } catch (error) {
    console.error(`Picture of listing ${id} not made`, error);
    return { success: false, message: aiErrorText((await getT()).t, error) ?? 'La IA no pudo crear la foto. Inténtalo otra vez.' };
  }
}

/** "Elegir imagen": a still frame for a video that came without one, so it can be the cover.
    Its other version (original or cleaned-up) gets the same still, so switching between them keeps it. */
export async function addAdminVideoStill(id: string, url: string) {
  if (!(await isAdmin()) || !idSchema.safeParse(id).success || !photoUrlSchema.safeParse(url).success || !isVideoUrl(url)) return NOT_ALLOWED;
  const submission = await prisma.submission.findUnique({ where: { id }, select: { rawImages: true, aiImages: true, images: true } });
  if (!submission) return { success: false, message: 'Este anuncio ya no existe' };
  try {
    const still = await uploadImage(await takeVideoStill(await fetchImage(videoSource(url))), `listing-${id}-still`);
    const withStill = (video: string) => mediaUrl(videoSource(video), 'video/mp4', still);
    const changed = new Map([[url, withStill(url)]]);
    const other = pictureCounterpart(submission, url)?.other;
    if (other && isVideoUrl(other)) changed.set(other, withStill(other));
    const replace = (urls: string[]) => urls.map((media) => changed.get(media) ?? media);
    await prisma.submission.update({
      where: { id },
      data: { rawImages: replace(submission.rawImages), aiImages: replace(submission.aiImages), images: replace(submission.images) },
    });
    return { success: true, message: '', url: withStill(url) };
  } catch (error) {
    console.error(`Still of video ${url} of listing ${id} not made`, error);
    return { success: false, message: 'No se pudo sacar una imagen del vídeo. Inténtalo otra vez.' };
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

/** "Activar de nuevo": an offline listing comes back with its pictures and texts. */
export async function enableAdminListing(id: string) {
  if (!(await isAdmin()) || !idSchema.safeParse(id).success) return NOT_ALLOWED;
  const outcome = await enableListing(id);
  if (!outcome) return { success: false, message: 'Este anuncio ya está online' };
  return { success: true, message: outcome === 'live' ? 'Anuncio online de nuevo' : 'Esperando el OK de la persona de nuevo' };
}

/** "1 mes más": a live listing stays online a month longer, for free; a payment for it is the admin's own business. */
export async function extendAdminListing(id: string) {
  if (!(await isAdmin()) || !idSchema.safeParse(id).success) return NOT_ALLOWED;
  const submission = await prisma.submission.findFirst({ where: { id, status: 'LIVE' }, select: { expiresAt: true, productId: true } });
  if (!submission) return { success: false, message: 'Solo un anuncio online se puede alargar' };
  const expiresAt = new Date(Math.max(submission.expiresAt?.getTime() ?? 0, Date.now()));
  expiresAt.setMonth(expiresAt.getMonth() + 1);
  await prisma.$transaction([
    prisma.submission.update({ where: { id }, data: { expiresAt, remindedAt: null } }),
    ...(submission.productId ? [prisma.product.update({ where: { id: submission.productId }, data: { expiresAt } })] : []),
  ]);
  revalidatePath('/');
  return { success: true, message: `Online hasta el ${expiresAt.toLocaleDateString('es-ES', { timeZone: 'Atlantic/Canary' })}` };
}

/** "Online hasta" changed in the editor: the listing (and its product, when online) ends with that whole day. */
export async function setAdminListingEnd(id: string, onlineUntil: string) {
  if (!(await isAdmin()) || !idSchema.safeParse(id).success || !/^\d{4}-\d{2}-\d{2}$/.test(onlineUntil)) return NOT_ALLOWED;
  const expiresAt = fromShopDateTime(`${onlineUntil}T23:59`);
  if (!expiresAt || expiresAt.getTime() <= Date.now()) return { success: false, message: 'Elige un día de hoy en adelante' };
  const submission = await prisma.submission.findUnique({ where: { id }, select: { productId: true, type: true } });
  if (!submission) return { success: false, message: 'Este anuncio ya no existe' };
  // An event ends with its own day.
  if (submission.type === 'EVENT') return { success: true, message: '' };
  await prisma.$transaction([
    prisma.submission.update({ where: { id }, data: { expiresAt, remindedAt: null } }),
    ...(submission.productId ? [prisma.product.update({ where: { id: submission.productId }, data: { expiresAt } })] : []),
  ]);
  revalidatePath('/');
  return { success: true, message: '' };
}

/** An event the admin marks as sold ends as cancelled, as when the person calls it off on their page. */
export async function markAdminListingSold(id: string) {
  if (!(await isAdmin()) || !idSchema.safeParse(id).success) return NOT_ALLOWED;
  const submission = await prisma.submission.findUnique({ where: { id }, select: { type: true, status: true } });
  if (submission?.status !== 'LIVE') return { success: false, message: 'Este anuncio ya no está online' };
  const isEvent = submission.type === 'EVENT';
  await takeDown(id, isEvent ? 'CANCELLED' : 'SOLD');
  return { success: true, message: isEvent ? 'Evento cancelado' : 'Marcado como vendido' };
}

/** "Ocultar": out of the shop for a while, with everything kept for "Mostrar de nuevo". */
export async function hideAdminListing(id: string) {
  if (!(await isAdmin()) || !idSchema.safeParse(id).success) return NOT_ALLOWED;
  const submission = await prisma.submission.findUnique({ where: { id }, select: { status: true } });
  if (submission?.status !== 'LIVE') return { success: false, message: 'Este anuncio ya no está online' };
  await takeDown(id, 'HIDDEN');
  return { success: true, message: 'Anuncio oculto' };
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
