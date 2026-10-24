import { revalidatePath } from 'next/cache';
import slugify from 'slugify';
import { prisma } from '@/db/prisma';
import { localize } from '@/lib/category';
import { sendText } from '@/lib/whatsapp-cloud/client';
import type { Seller, Submission, SubmissionStatus } from '@prisma/client';
import { LISTING_DAYS, LISTING_PRICES, productUrl, type ListingPlan } from './config';
import { reviewerOf } from './review';
import { sendListingsEmail } from './listings-email';
import { botText, localeOf } from './messages';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface ListingPayment {
  submissionId: string;
  provider: 'Stripe' | 'PayPal';
  paymentId: string;
  /** What the payment provider says was paid, as a fixed-2 string. */
  amountPaid: string;
}

export type PublishOutcome = 'published' | 'already-published' | 'wrong-amount' | 'not-found';

// Spanish first, the English description for visitors from abroad below it.
const productDescription = (es: string | null, en: string | null) => [es, en && `🇬🇧 ${en}`].filter(Boolean).join('\n\n');

// The showroom only shows products in a store category, so an unknown one goes to "otros".
const FALLBACK_CATEGORY_SLUG = 'otros';

async function findStoreCategoryIds(name: string | null) {
  const categories = await prisma.category.findMany({ select: { id: true, slug: true, name: true } });
  const match =
    categories.find((category) => name && localize(category.name, 'es').toLowerCase() === name.toLowerCase()) ??
    categories.find((category) => category.slug === FALLBACK_CATEGORY_SLUG);
  return match ? [{ id: match.id }] : [];
}

type SubmissionWithSeller = Submission & { seller: Seller };

/** Only real phone numbers get WhatsApp messages (the house seller of admin listings has none). */
const isPhoneNumber = (waId: string) => /^\d+$/.test(waId);

/**
 * The listing becomes a product, once: the status check inside the transaction keeps parallel
 * payments (or a payment and an admin click) from publishing twice. Returns null when it already went live.
 */
async function goLive(submission: SubmissionWithSeller, from: SubmissionStatus[], paymentLabel: string) {
  const plan = (submission.plan ?? 'normal') as ListingPlan;
  const expiresAt = new Date(Date.now() + LISTING_DAYS * DAY_MS);
  const title = submission.title ?? 'Anuncio';
  const categories = await findStoreCategoryIds(submission.category);
  const contactPhone = submission.hasContactConsent && isPhoneNumber(submission.seller.waId) ? `+${submission.seller.waId}` : null;

  const product = await prisma.$transaction(async (tx) => {
    const { count } = await tx.submission.updateMany({
      where: { id: submission.id, status: { in: from } },
      data: { status: 'LIVE', paidAt: new Date(), paymentProvider: paymentLabel, expiresAt },
    });
    if (count === 0) return null;
    const created = await tx.product.create({
      data: {
        name: title,
        slug: `${slugify(title, { lower: true, strict: true })}-${submission.id.slice(0, 6)}`,
        category: submission.category ?? 'Varios',
        images: submission.images.length > 0 ? submission.images : submission.rawImages,
        brand: submission.seller.name ?? 'Particular',
        description: productDescription(submission.description, submission.descriptionEn),
        stock: 1,
        price: submission.price ?? 0,
        isFeatured: plan === 'big',
        contactPhone,
        sellerId: submission.sellerId,
        expiresAt,
        categories: { connect: categories },
      },
    });
    await tx.submission.update({ where: { id: submission.id }, data: { productId: created.id } });
    return created;
  });
  if (!product) return null;

  revalidatePath('/');
  const url = productUrl(product.slug);
  const sellerWaId = submission.seller.waId;
  const reviewer = reviewerOf(sellerWaId);
  // Telling people is best effort: the listing is live either way.
  await Promise.allSettled([
    isPhoneNumber(sellerWaId) && sendText(sellerWaId, botText(localeOf(sellerWaId), 'live', { days: LISTING_DAYS, url })),
    reviewer &&
      !submission.createdByAdmin &&
      sendText(
        reviewer,
        [
          `🟢 Nuevo producto online: ${title} (${plan === 'big' ? 'Grande' : 'Normal'})`,
          url,
          submission.crossPostFacebook ? '📌 Publicar también en Facebook' : '',
          submission.crossPostWallapop ? '📌 Publicar también en Wallapop' : '',
        ]
          .filter(Boolean)
          .join('\n')
      ),
    sendListingsEmail(),
  ]);
  return product;
}

/**
 * A paid listing becomes a product. Payment webhooks can arrive twice or together with the
 * PayPal capture, so only the first call publishes and the others report "already-published".
 */
export async function publishSubmission(payment: ListingPayment): Promise<PublishOutcome> {
  const submission = await prisma.submission.findUnique({ where: { id: payment.submissionId }, include: { seller: true } });
  if (!submission) return 'not-found';
  if (submission.status !== 'AWAITING_PAYMENT') return 'already-published';
  if (payment.amountPaid !== LISTING_PRICES[(submission.plan ?? 'normal') as ListingPlan]) return 'wrong-amount';
  const product = await goLive(submission, ['AWAITING_PAYMENT'], `${payment.provider}:${payment.paymentId}`);
  return product ? 'published' : 'already-published';
}

/** The admin puts a listing online without payment (own listings, or a seller who paid otherwise). */
export async function publishByAdmin(submissionId: string, plan: ListingPlan) {
  const submission = await prisma.submission.update({
    where: { id: submissionId },
    data: { plan },
    include: { seller: true },
  });
  return goLive(submission, ['IN_REVIEW', 'AWAITING_PAYMENT'], 'Admin');
}

/** A live listing leaves the shop (sold or expired); the submission keeps the record. */
export async function takeDown(submissionId: string, status: 'SOLD' | 'EXPIRED') {
  const submission = await prisma.submission.update({ where: { id: submissionId }, data: { status } });
  // Showcase mode shows every product, sold out or not, so the product itself goes.
  if (submission.productId) await prisma.product.delete({ where: { id: submission.productId } }).catch(() => {});
  revalidatePath('/');
}
