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
import { sellerNameSchema, sellerPhoneSchema } from '@/lib/validators';
import { isVideoUrl, mediaUrl, pictureOf, videoSource } from '@/lib/video';
import { categoryName, categoryRefs, findCategory, getListingCategories, toProductTranslations, type ListingTranslations } from './catalog';
import { correctText, createPicture, enhancePhoto, translateText, writeListing } from './ai';
import { loadAddresses } from './address-search';
import { HOUSE_SELLER, LISTING_PRICES, publishUrl, UNPAID_LISTING_HOURS } from './config';
import { botText, localeOf } from './messages';
import { toWaId } from './seller';
import { moveListingToNumber } from './seller-number';
import { fetchImage, uploadImage } from './media';
import { TEXT_MODES, type ListingTexts, type TextMode, type TextVersions } from './text-versions';
import { makeListingPictures, processSubmission } from './processing';
import { lacksConsent, markSent } from './listing-payment';
import { enableListing, publishByAdmin, takeDown } from './publish';
import { pictureCounterpart } from './pictures';
import { takeVideoStill } from './video-cleanup';

// Server actions are public endpoints: every one checks for an admin itself.
const NOT_ALLOWED = { success: false, message: 'Solo para administradores' } as const;

// Only photos uploaded through UploadThing, so the server never fetches an arbitrary URL.
const photoUrlSchema = z.string().refine((value) => {
  if (!URL.canParse(value)) return false;
  const { protocol, hostname } = new URL(value);
  return protocol === 'https:' && (hostname === 'utfs.io' || hostname.endsWith('.ufs.sh'));
});

// No photos: the AI makes the picture from the admin's idea (usual for a wanted ad), never from the description.
// useAi false: the photos and videos are used as they are, no AI pictures.
const newListingSchema = z.object({
  photos: z.array(photoUrlSchema).max(8),
  type: z.enum(LISTING_TYPES).default('PRODUCT'),
  useAi: z.boolean().default(true),
  // The admin's idea for the AI pictures: on top of the photos' clean-up, or without photos the whole picture.
  picturePrompt: z.string().trim().max(500).transform((text) => text || null).default(''),
});

export type NewListingInput = z.input<typeof newListingSchema>;

/** Step 1: the photos or the idea; the AI starts on the shop pictures while the admin goes on to the description. */
export async function createAdminListing(input: NewListingInput) {
  if (!(await isAdmin())) return NOT_ALLOWED;
  const parsed = newListingSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: 'Revisa las fotos' };

  const seller = await prisma.seller.upsert({ where: { waId: HOUSE_SELLER }, update: {}, create: { waId: HOUSE_SELLER } });
  // COLLECTING until the description arrives: only the pictures are made now.
  const { photos, type, useAi, picturePrompt } = parsed.data;
  if (!useAi && photos.length === 0) return { success: false, message: 'Sube una foto o un vídeo' };
  if (photos.length === 0 && !picturePrompt) return { success: false, message: 'Escribe tu idea para la foto' };
  // Without AI the originals are the pictures at once, in the admin's order: a first video's still is the cover.
  const images = useAi ? [] : photos;
  const submission = await prisma.submission.create({
    data: { sellerId: seller.id, status: 'COLLECTING', createdByAdmin: true, rawImages: photos, images, usesAi: useAi, type, picturePrompt },
  });
  if (useAi) after(() => makeListingPictures(submission.id));
  return { success: true, message: 'La IA está haciendo las fotos', id: submission.id };
}

const photosSchema = newListingSchema.pick({ photos: true, useAi: true, picturePrompt: true }).extend({ type: z.enum(LISTING_TYPES).optional() });

/** Back on step 1 before the description is sent: other photos, or the other choice of AI pictures or none.
    Photos that stay keep their AI picture, so only new ones go to the AI; other words for the pictures remake them all.
    The type tabs switch the type here too. */
export async function updateAdminListingPhotos(id: string, input: z.input<typeof photosSchema>) {
  if (!(await isAdmin()) || !idSchema.safeParse(id).success) return NOT_ALLOWED;
  const parsed = photosSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: 'Revisa las fotos' };
  const { photos, useAi, type, picturePrompt } = parsed.data;
  if (!useAi && photos.length === 0) return { success: false, message: 'Sube una foto o un vídeo' };
  if (photos.length === 0 && !picturePrompt) return { success: false, message: 'Escribe tu idea para la foto' };
  const current = await prisma.submission.findUnique({ where: { id }, select: { rawImages: true, aiImages: true, usesAi: true, picturePrompt: true } });
  if (!current) return NOT_ALLOWED;
  const isWishChanged = picturePrompt !== current.picturePrompt;
  // Only the type: the pictures may still be on their way, so no second run starts.
  if (useAi === current.usesAi && photos.join() === current.rawImages.join() && !isWishChanged) {
    const { count } = await prisma.submission.updateMany({ where: { id, status: 'COLLECTING', createdByAdmin: true }, data: { type } });
    return count > 0 ? { success: true, message: 'Tipo guardado' } : { success: false, message: 'La IA ya está escribiendo este anuncio' };
  }
  const aiImages = photos.map((url) => (isWishChanged ? '' : (current.aiImages[current.rawImages.indexOf(url)] ?? '')));
  const photoFiles = photos.filter((url) => !isVideoUrl(url));
  const madeBefore = photoFiles.map((url) => aiImages[photos.indexOf(url)]);
  const hasPictureSource = photos.some(pictureOf);
  // Only videos: their stills go to the AI again, as those pictures aren't kept next to them. No photo: a new picture from the idea.
  const needsAi = useAi && (hasPictureSource ? photoFiles.length === 0 || madeBefore.some((url) => !url) : Boolean(picturePrompt));
  // Nothing new for the AI: the pictures are there at once, in the order the pictures' run saves them.
  const images = !useAi ? photos : needsAi || !hasPictureSource ? [] : [...madeBefore, ...photos.filter(isVideoUrl)];
  const { count } = await prisma.submission.updateMany({
    where: { id, status: 'COLLECTING', createdByAdmin: true },
    data: { rawImages: photos, aiImages, images, usesAi: useAi, type, picturePrompt, lastError: null, attempts: 0 },
  });
  if (count === 0) return { success: false, message: 'La IA ya está escribiendo este anuncio' };
  if (needsAi) after(() => makeListingPictures(id));
  return { success: true, message: 'Fotos guardadas' };
}

const descriptionSchema = z.object({
  notes: z.string().trim().max(2000),
  sellerPhone: sellerPhoneSchema.optional(),
  // The person's name or nickname, checked like on their own page; empty: the one they have stays.
  sellerName: sellerNameSchema.optional(),
  // 'original': the notes are the description as they are, only translated; 'corrected': the same with their mistakes fixed.
  textMode: z.enum(TEXT_MODES).default('ai'),
  originalTitle: z.string().trim().max(120).optional(),
});

export type ListingDescriptionInput = z.input<typeof descriptionSchema>;

/** Step 2: everything the admin knows about the item; the AI writes the listing from it and the pictures. */
export async function describeAdminListing(id: string, input: ListingDescriptionInput) {
  if (!(await isAdmin()) || !idSchema.safeParse(id).success) return NOT_ALLOWED;
  const parsed = descriptionSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.path[0] === 'sellerName' ? 'Revisa el nombre' : 'Revisa el teléfono' };
  const { notes, sellerPhone, sellerName, textMode, originalTitle } = parsed.data;
  // Buyers write to the person directly: "through the Corral" is parked for now (#131).
  if (!sellerPhone) return { success: false, message: 'Escribe su WhatsApp' };
  if (textMode !== 'ai' && !notes) return { success: false, message: 'Escribe tu texto para usarlo tal cual' };
  const listing = await prisma.submission.findUnique({ where: { id }, select: { rawImages: true, images: true, lastError: true } });
  // A video without a still counts as no photo: the AI makes the picture from the description.
  const hasPhoto = Boolean(listing?.rawImages.some(pictureOf));
  if (!hasPhoto && !notes) return { success: false, message: 'Sin foto, la IA necesita tu descripción para crearla' };
  // Their OK to show the number comes later, from them.
  const waId = toWaId(sellerPhone);
  const name = sellerName ?? undefined;
  const seller = await prisma.seller.upsert({ where: { waId }, update: { name }, create: { waId, name } });
  // Also while the AI still makes the pictures: the text is written at the same time.
  const { count } = await prisma.submission.updateMany({
    where: { id, status: 'COLLECTING', createdByAdmin: true },
    data: {
      status: 'PROCESSING',
      rawText: notes,
      sellerId: seller.id,
      textMode,
      originalTitle: (textMode !== 'ai' && originalTitle) || null,
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
  // The type can change any time; none: it stays as it is.
  type: z.enum(LISTING_TYPES).optional(),
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
  // The person's WhatsApp, checked like on their own page; missing: the number stays as it is.
  sellerPhone: sellerPhoneSchema.optional(),
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
  // Everything is checked for the type it is saved as.
  const type = (parsed.success && parsed.data.type) || current?.type;
  const isService = type === 'SERVICE';
  const isWanted = type === 'WANTED';
  const isEvent = type === 'EVENT';
  // A wanted ad may have only an upper end ("hasta 60 €").
  const hasPrice = parsed.success && (parsed.data.price || (isWanted && parsed.data.priceMax));
  if (!parsed.success || (!isService && !hasPrice)) return { success: false, message: 'Revisa el título, el precio y las fotos' };
  if (isEvent && !parsed.data.startsAt) return { success: false, message: 'Elige la fecha y la hora del evento' };
  const category = findCategory(await getListingCategories(), parsed.data.category);
  if (!category) return { success: false, message: 'Elige una de las categorías' };
  if (parsed.data.condition === ANY_CONDITION && !isWanted) return { success: false, message: 'Elige el estado del artículo' };
  if (isWanted && parsed.data.priceMax && Number(parsed.data.priceMax) <= Number(parsed.data.price)) {
    return { success: false, message: 'Hasta tiene que ser más que Desde' };
  }
  if (parsed.data.placeId && !(await prisma.place.findUnique({ where: { id: parsed.data.placeId }, select: { id: true } }))) {
    return { success: false, message: 'Elige uno de los lugares' };
  }
  // Merged, so a language the editor doesn't show (e.g. one switched off for now) keeps its text.
  const translations = { ...(current?.translations as ListingTranslations), ...parsed.data.translations };
  const { textMode = current?.textMode as TextMode, sellerPhone, ...fields } = parsed.data;
  const newWaId = sellerPhone === undefined ? undefined : toWaId(sellerPhone);
  // A person's listing keeps a number to write to; the house's own may stay without one.
  if (newWaId === HOUSE_SELLER && current?.seller.waId !== HOUSE_SELLER) return { success: false, message: 'Escribe su WhatsApp' };
  if (current && newWaId && newWaId !== current.seller.waId) await moveListingToNumber({ id, ...current }, newWaId);
  // A service's empty price takes its "from" price away, a wanted ad's its lower end; only a service has a kind of offer.
  const typed = isService ? { ...fields, price: fields.price ?? null } : { ...fields, price: isWanted ? (fields.price ?? null) : fields.price, serviceType: null };
  // What the editor kept from another type goes: only an item for sale has a condition, only an event a date and address.
  const edit = { ...typed, condition: type === 'PRODUCT' ? typed.condition : null, startsAt: isEvent ? typed.startsAt : null, address: isEvent ? typed.address : null };
  // Only a wanted ad has a range, and only one whose upper end is above its lower end (none counts as 0).
  const priceMax = isWanted && edit.priceMax && Number(edit.priceMax) > Number(edit.price ?? 0) ? edit.priceMax : null;
  const versions = (current?.textVersions ?? {}) as TextVersions;
  const editedVersion: ListingTexts = { ...translations, [getShopLocale()]: { title: edit.title, description: edit.description, short: edit.shortTitle ?? '' } };
  // A save that was still on its way when the admin switched texts only updates its own version, never the one in use.
  if (textMode !== current?.textMode) {
    await prisma.submission.update({ where: { id }, data: { textVersions: { ...versions, [textMode]: editedVersion } } });
    return { success: true, message: 'Guardado' };
  }
  const submission = await prisma.submission.update({
    where: { id },
    data: { ...edit, priceMax, translations, category: category.slug, textVersions: { ...versions, [textMode]: editedVersion } },
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
        // Badges, "sold" words and filters follow the new type.
        type: submission.type,
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

/** One more picture made by the AI: from the admin's idea, else their uploaded photo improved. Never from the description:
    with neither there is nothing to make it from. The editor adds it and saves. */
export async function createAdminListingPicture(id: string, prompt?: string) {
  if (!(await isAdmin()) || !idSchema.safeParse(id).success) return NOT_ALLOWED;
  const parsed = picturePromptSchema.safeParse(prompt);
  if (!parsed.success) return { success: false, message: 'Describe la foto en menos palabras' };
  const submission = await prisma.submission.findUnique({ where: { id }, select: { type: true, rawImages: true } });
  if (!submission) return { success: false, message: 'Este anuncio ya no existe' };
  const photoUrl = submission.rawImages.map(pictureOf).find(Boolean);
  if (!parsed.data && !photoUrl) return { success: false, message: 'Escribe primero tu idea o sube una foto' };
  try {
    const picture = parsed.data ? await createPicture({ title: parsed.data, description: '' }, submission.type) : await enhancePhoto(await fetchImage(photoUrl!), submission.type);
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
  return { success: true, message: outcome === 'live' ? 'Anuncio online de nuevo' : 'Esperando el pago de nuevo' };
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
