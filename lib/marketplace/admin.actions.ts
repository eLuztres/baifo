'use server';

import { after } from 'next/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/db/prisma';
import { isAdmin } from '@/lib/auth-guard';
import { PRODUCT_CONDITIONS } from '@/lib/constants';
import { HOUSE_SELLER } from './config';
import { processSubmission } from './processing';
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

const newListingSchema = z.object({
  photos: z.array(photoUrlSchema).min(1).max(8),
  notes: z.string().max(2000).default(''),
  price: z
    .string()
    .regex(/^\d{1,6}([.,]\d{1,2})?$/)
    .transform((value) => Number(value.replace(',', '.')).toFixed(2))
    .optional(),
  sellerPhone: z
    .string()
    .transform((value) => value.replace(/\D/g, ''))
    .refine((digits) => digits === '' || (digits.length >= 9 && digits.length <= 15))
    .optional(),
  hasContactConsent: z.boolean().default(false),
});

export type NewListingInput = z.input<typeof newListingSchema>;

/** Photos (+ optional words, price and seller) → a listing the AI prepares in the background. */
export async function createAdminListing(input: NewListingInput) {
  if (!(await isAdmin())) return NOT_ALLOWED;
  const parsed = newListingSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: 'Revisa las fotos, el precio y el teléfono' };
  const { photos, notes, price, sellerPhone, hasContactConsent } = parsed.data;

  // A Spanish mobile without country code gets +34.
  const waId = sellerPhone ? (sellerPhone.length === 9 ? `34${sellerPhone}` : sellerPhone) : HOUSE_SELLER;
  const seller = await prisma.seller.upsert({ where: { waId }, update: {}, create: { waId } });
  const submission = await prisma.submission.create({
    data: {
      sellerId: seller.id,
      status: 'PROCESSING',
      createdByAdmin: true,
      rawImages: photos,
      rawText: notes,
      price,
      hasContactConsent: Boolean(sellerPhone) && hasContactConsent,
    },
  });
  after(() => processSubmission(submission.id));
  return { success: true, message: 'La IA está preparando el anuncio', id: submission.id };
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

const editSchema = z.object({
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(3000),
  descriptionEn: z.string().trim().max(3000),
  category: z.string().trim().max(60),
  // Empty: the admin took the condition away.
  condition: z.union([z.enum(PRODUCT_CONDITIONS), z.literal('')]).transform((value) => value || null).optional(),
  price: z
    .string()
    .regex(/^\d{1,6}([.,]\d{1,2})?$/)
    .transform((value) => Number(value.replace(',', '.')).toFixed(2)),
  images: z.array(photoUrlSchema).min(1).max(12),
});

export type ListingEdit = z.input<typeof editSchema>;

export async function updateAdminListing(id: string, input: ListingEdit) {
  if (!(await isAdmin()) || !idSchema.safeParse(id).success) return NOT_ALLOWED;
  const parsed = editSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: 'Revisa el título, el precio y las fotos' };
  const submission = await prisma.submission.update({ where: { id }, data: parsed.data });
  // A live listing's product follows the edit.
  if (submission.productId) {
    const { title, description, descriptionEn, price, images, category, condition } = parsed.data;
    await prisma.product.update({
      where: { id: submission.productId },
      data: { name: title, price, images, category, condition, description: [description, descriptionEn && `🇬🇧 ${descriptionEn}`].filter(Boolean).join('\n\n') },
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

/** The AI failed: start the work again from where it stopped. */
export async function retryAdminListing(id: string) {
  if (!(await isAdmin()) || !idSchema.safeParse(id).success) return NOT_ALLOWED;
  await prisma.submission.update({ where: { id }, data: { status: 'PROCESSING', attempts: 0, lastError: null } });
  after(() => processSubmission(id));
  return { success: true, message: 'La IA lo intenta otra vez' };
}
