'use server';

import { after } from 'next/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/db/prisma';
import { isAdmin } from '@/lib/auth-guard';
import { PRODUCT_CONDITIONS, PRODUCT_KINDS, type ProductKind } from '@/lib/constants';
import { getEnabledLocales, getShopLocale } from '@/lib/i18n-server';
import { categoryName, categoryRefs, findCategory, getListingCategories, toProductTranslations, type ListingTranslations } from './catalog';
import { translateText, writeListing } from './ai';
import { HOUSE_SELLER } from './config';
import { fetchImage } from './media';
import { TEXT_MODES, type ListingTexts, type TextMode, type TextVersions } from './text-versions';
import { makeListingPictures, processSubmission } from './processing';
import { publishByAdmin, takeDown } from './publish';
import { approveSubmission, rejectSubmission } from './review';

// Server actions are public endpoints: every one checks for an admin itself.
const NOT_ALLOWED = { success: false, message: 'Solo para administradores' } as const;

// Only photos uploaded through UploadThing, so the server never fetches an arbitrary URL.
const photoUrlSchema = z.string().refine((value) => {
  if (!URL.canParse(value)) return false;
  const { protocol, hostname } = new URL(value);
  return protocol === 'https:' && (hostname === 'utfs.io' || hostname.endsWith('.ufs.sh'));
});

const newListingSchema = z.object({ photos: z.array(photoUrlSchema).min(1).max(8), kind: z.enum(PRODUCT_KINDS).default('product') });

export type NewListingInput = z.input<typeof newListingSchema>;

/** Step 1: the photos alone; the AI makes the shop pictures while the admin looks on. */
export async function createAdminListing(input: NewListingInput) {
  if (!(await isAdmin())) return NOT_ALLOWED;
  const parsed = newListingSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: 'Revisa las fotos' };

  const seller = await prisma.seller.upsert({ where: { waId: HOUSE_SELLER }, update: {}, create: { waId: HOUSE_SELLER } });
  // COLLECTING until the description arrives: only the pictures are made now.
  const submission = await prisma.submission.create({
    data: { sellerId: seller.id, status: 'COLLECTING', createdByAdmin: true, rawImages: parsed.data.photos, kind: parsed.data.kind },
  });
  after(() => makeListingPictures(submission.id));
  return { success: true, message: 'La IA está haciendo las fotos', id: submission.id };
}

const descriptionSchema = z.object({
  notes: z.string().trim().max(2000),
  sellerPhone: z
    .string()
    .transform((value) => value.replace(/\D/g, ''))
    .refine((digits) => digits === '' || (digits.length >= 9 && digits.length <= 15))
    .optional(),
  hasContactConsent: z.boolean().default(false),
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
  const { notes, sellerPhone, hasContactConsent, textMode, originalTitle } = parsed.data;
  if (textMode === 'original' && !notes) return { success: false, message: 'Escribe tu texto para usarlo tal cual' };
  const listing = await prisma.submission.findUnique({ where: { id }, select: { kind: true } });
  // A service is nothing without the person's WhatsApp, and that number goes public.
  if (listing?.kind === 'service' && !(sellerPhone && hasContactConsent)) {
    return { success: false, message: 'Un servicio necesita el WhatsApp de la persona y su permiso para mostrarlo' };
  }

  // A Spanish mobile without country code gets +34.
  const waId = sellerPhone ? (sellerPhone.length === 9 ? `34${sellerPhone}` : sellerPhone) : HOUSE_SELLER;
  const seller = await prisma.seller.upsert({ where: { waId }, update: {}, create: { waId } });
  // Only once the pictures are there, so the AI never makes them twice.
  const { count } = await prisma.submission.updateMany({
    where: { id, status: 'COLLECTING', createdByAdmin: true, images: { isEmpty: false } },
    data: {
      status: 'PROCESSING',
      rawText: notes,
      sellerId: seller.id,
      hasContactConsent: Boolean(sellerPhone) && hasContactConsent,
      textMode,
      originalTitle: (textMode === 'original' && originalTitle) || null,
    },
  });
  if (count === 0) return { success: false, message: 'Las fotos todavía no están listas' };
  after(() => processSubmission(id));
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
  const { price, ...rest } = submission;
  return { ...rest, price: price?.toString() ?? null };
}

export type AdminListing = NonNullable<Awaited<ReturnType<typeof getAdminListing>>>;

const textSchema = z.object({ title: z.string().trim().max(120), description: z.string().trim().max(3000) });

const editSchema = z.object({
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(3000),
  // The other shop languages; the shop language's text is title and description.
  translations: z.record(z.string(), textSchema),
  category: z.string().trim().max(60),
  // Empty: the admin took the condition away.
  condition: z.union([z.enum(PRODUCT_CONDITIONS), z.literal('')]).transform((value) => value || null).optional(),
  // Missing for a service, which never has a price.
  price: z
    .string()
    .regex(/^\d{1,6}([.,]\d{1,2})?$/)
    .transform((value) => Number(value.replace(',', '.')).toFixed(2))
    .optional(),
  images: z.array(photoUrlSchema).min(1).max(12),
  // Which of the two texts these title and description are.
  textMode: z.enum(TEXT_MODES).optional(),
});

export type ListingEdit = z.input<typeof editSchema>;

export async function updateAdminListing(id: string, input: ListingEdit) {
  if (!(await isAdmin()) || !idSchema.safeParse(id).success) return NOT_ALLOWED;
  const parsed = editSchema.safeParse(input);
  const current = await prisma.submission.findUnique({ where: { id }, select: { translations: true, kind: true, textMode: true, textVersions: true } });
  const isService = current?.kind === 'service';
  if (!parsed.success || (!isService && !parsed.data.price)) return { success: false, message: 'Revisa el título, el precio y las fotos' };
  const category = findCategory(await getListingCategories(current?.kind as ProductKind), parsed.data.category);
  if (!category) return { success: false, message: 'Elige una de las categorías' };
  // Merged, so a language the editor doesn't show (e.g. one switched off for now) keeps its text.
  const translations = { ...(current?.translations as ListingTranslations), ...parsed.data.translations };
  const { textMode = current?.textMode as TextMode, ...edit } = parsed.data;
  const versions = (current?.textVersions ?? {}) as TextVersions;
  const editedVersion: ListingTexts = { ...translations, [getShopLocale()]: { title: edit.title, description: edit.description } };
  // A save that was still on its way when the admin switched texts only updates its own version, never the one in use.
  if (textMode !== current?.textMode) {
    await prisma.submission.update({ where: { id }, data: { textVersions: { ...versions, [textMode]: editedVersion } } });
    return { success: true, message: 'Guardado' };
  }
  const submission = await prisma.submission.update({
    where: { id },
    data: { ...edit, translations, category: category.slug, textVersions: { ...versions, [textMode]: editedVersion } },
  });
  // A live listing's product follows the edit.
  if (submission.productId) {
    const { title, description, price, images, condition } = parsed.data;
    await prisma.product.update({
      where: { id: submission.productId },
      data: {
        name: title,
        description,
        translations: toProductTranslations(translations),
        price: isService ? 0 : price,
        images,
        condition,
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
      const own = { title: submission.originalTitle || submission.title || '', description: submission.rawText };
      texts = { [shopLocale]: own, ...(await translateText(own, shopLocale, otherLocales)) };
    }
    if (!texts) {
      const kind = submission.kind as ProductKind;
      const photo = await fetchImage(submission.rawImages[0]);
      texts = (await writeListing(photo, submission.rawText, await getListingCategories(kind), [shopLocale, ...otherLocales], kind)).texts;
    }
  } catch (error) {
    console.error(`Text of listing ${id} not made`, error);
    return { success: false, message: 'La IA no pudo hacer el texto. Inténtalo otra vez.' };
  }
  await prisma.submission.update({ where: { id }, data: { textMode: mode, textVersions: { ...versions, [mode]: texts } } });
  return { success: true, message: '', texts };
}

/** The shop-language title and description translated again into every other language, after the admin changed them. */
export async function translateListingText(id: string, text: { title: string; description: string }) {
  if (!(await isAdmin()) || !idSchema.safeParse(id).success) return NOT_ALLOWED;
  const parsed = textSchema.safeParse(text);
  if (!parsed.success) return { success: false, message: 'Revisa el título y la descripción' };
  const [shopLocale, ...otherLocales] = listingLocales();
  try {
    return { success: true, message: '', translations: await translateText(parsed.data, shopLocale, otherLocales) };
  } catch (error) {
    console.error(`Listing ${id} not translated`, error);
    return { success: false, message: 'No se pudo traducir. Inténtalo otra vez.' };
  }
}

/** The category step: the admin confirms or changes what the AI recognized, also while it still makes the pictures. */
export async function setAdminListingCategory(id: string, slug: string) {
  if (!(await isAdmin()) || !idSchema.safeParse(id).success) return NOT_ALLOWED;
  const listing = await prisma.submission.findUnique({ where: { id }, select: { kind: true } });
  const category = findCategory(await getListingCategories(listing?.kind as ProductKind), slug);
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

const planSchema = z.enum(['normal', 'big']);

/** "Publicar ahora": online at once, without payment. */
export async function publishAdminListing(id: string, plan: 'normal' | 'big') {
  if (!(await isAdmin()) || !idSchema.safeParse(id).success || !planSchema.safeParse(plan).success) return NOT_ALLOWED;
  const product = await publishByAdmin(id, plan);
  return product
    ? { success: true, message: 'Anuncio online', slug: product.slug }
    : { success: false, message: 'Este anuncio ya no se puede publicar' };
}

/** Sends the seller the WhatsApp link to choose a plan and pay (the same as approving on WhatsApp). */
export async function sendAdminPaymentLink(id: string) {
  if (!(await isAdmin()) || !idSchema.safeParse(id).success) return NOT_ALLOWED;
  const submission = await prisma.submission.findUnique({ where: { id }, include: { seller: true } });
  if (!submission || submission.seller.waId === HOUSE_SELLER) return { success: false, message: 'Este anuncio no tiene vendedor con WhatsApp' };
  const approved = await approveSubmission(id);
  return approved ? { success: true, message: 'Enlace de pago enviado por WhatsApp' } : { success: false, message: 'Ya no está pendiente de revisión' };
}

export async function rejectAdminListing(id: string) {
  if (!(await isAdmin()) || !idSchema.safeParse(id).success) return NOT_ALLOWED;
  const rejected = await rejectSubmission(id);
  return rejected ? { success: true, message: 'Anuncio rechazado' } : { success: false, message: 'Ya no está pendiente de revisión' };
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
  const submission = await prisma.submission.findUnique({ where: { id }, select: { status: true } });
  // Still on the photos step: only the pictures are tried again.
  if (submission?.status === 'COLLECTING') {
    await prisma.submission.update({ where: { id }, data: { attempts: 0, lastError: null } });
    after(() => makeListingPictures(id));
  } else {
    await prisma.submission.update({ where: { id }, data: { status: 'PROCESSING', attempts: 0, lastError: null } });
    after(() => processSubmission(id));
  }
  return { success: true, message: 'La IA lo intenta otra vez' };
}
