import { revalidatePath } from 'next/cache';
import slugify from 'slugify';
import { prisma } from '@/db/prisma';
import { getShopLocale } from '@/lib/i18n-server';
import { getDefaultPlaceId } from '@/lib/places';
import { sendText } from '@/lib/whatsapp-cloud/client';
import type { Seller, Submission, SubmissionStatus } from '@prisma/client';
import { ADMIN_WHATSAPP_NUMBER, LISTING_DAYS, LISTING_PRICES, productUrl, type ListingPlan } from './config';
import { categoryName, categoryRefs, FALLBACK_CATEGORY_SLUG, findCategory, getListingCategories, toProductTranslations } from './catalog';
import { sendListingsEmail } from './listings-email';
import { botText, localeOf } from './messages';
import { lacksConsent } from './listing-payment';
import { sendWithTemplateFallback } from './templates';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface ListingPayment {
  submissionId: string;
  provider: 'Stripe' | 'PayPal';
  paymentId: string;
  /** What the payment provider says was paid, as a fixed-2 string. */
  amountPaid: string;
}

export type PublishOutcome = 'published' | 'already-published' | 'wrong-amount' | 'not-found';

type SubmissionWithSeller = Submission & { seller: Seller };

/** A fee to book together with the listing going live. */
interface FeeRecord {
  method: 'stripe' | 'paypal' | 'bizum' | 'cash';
  amount: string;
  recordedBy?: string;
}

/** Only real phone numbers get WhatsApp messages (the house seller of admin listings has none). */
const isPhoneNumber = (waId: string) => /^\d+$/.test(waId);

/**
 * The listing becomes a product, once: the status check inside the transaction keeps parallel
 * payments (or a payment and an admin click) from publishing twice. Returns null when it already went live.
 */
async function goLive(submission: SubmissionWithSeller, from: SubmissionStatus[], paymentLabel: string, fee?: FeeRecord) {
  const plan = (submission.plan ?? 'normal') as ListingPlan;
  const expiresAt = new Date(Date.now() + LISTING_DAYS * DAY_MS);
  const title = submission.title ?? 'Anuncio';
  const categories = await getListingCategories();
  const category = findCategory(categories, submission.category) ?? findCategory(categories, FALLBACK_CATEGORY_SLUG);
  // Listings from before places, or made while none was live, go to the first live place.
  const placeId = submission.placeId ?? (await getDefaultPlaceId());
  const contactPhone = submission.hasContactConsent && isPhoneNumber(submission.seller.waId) ? `+${submission.seller.waId}` : null;

  const product = await prisma.$transaction(async (tx) => {
    const { count } = await tx.submission.updateMany({
      where: { id: submission.id, status: { in: from } },
      data: { status: 'LIVE', paidAt: new Date(), paymentProvider: paymentLabel, expiresAt, remindedAt: null },
    });
    if (count === 0) return null;
    const created = await tx.product.create({
      data: {
        name: title,
        shortName: submission.shortTitle,
        slug: `${slugify(title, { lower: true, strict: true })}-${submission.id.slice(0, 6)}`,
        category: categoryName(category, getShopLocale()) || 'Varios',
        condition: submission.condition,
        images: submission.images.length > 0 ? submission.images : submission.rawImages,
        brand: submission.seller.name ?? 'Particular',
        description: submission.description ?? '',
        translations: toProductTranslations(submission.translations),
        stock: 1,
        // 0: a service without a "from" price, or a free event.
        price: submission.price ?? 0,
        priceMax: submission.priceMax,
        type: submission.type,
        serviceType: submission.serviceType,
        startsAt: submission.startsAt,
        address: submission.address,
        placeId,
        isFeatured: plan === 'big',
        contactPhone,
        sellerId: submission.sellerId,
        expiresAt,
        categories: { connect: category ? categoryRefs(category) : [] },
      },
    });
    await tx.submission.update({ where: { id: submission.id }, data: { productId: created.id } });
    if (fee) {
      await tx.listingFee.create({
        data: { submissionId: submission.id, title, method: fee.method, amount: fee.amount, payCode: submission.payCode, recordedBy: fee.recordedBy },
      });
    }
    return created;
  });
  if (!product) return null;

  revalidatePath('/');
  const url = productUrl(product.slug);
  const sellerWaId = submission.seller.waId;
  const reviewer = ADMIN_WHATSAPP_NUMBER;
  const sellerLocale = localeOf(sellerWaId);
  const planName = plan === 'big' ? 'Grande' : 'Normal';
  const crossPosts = [submission.crossPostFacebook && 'Facebook', submission.crossPostWallapop && 'Wallapop'].filter(Boolean).join(', ');
  // Telling people is best effort: the listing is live either way.
  await Promise.allSettled([
    isPhoneNumber(sellerWaId) &&
      sendWithTemplateFallback(sellerWaId, () => sendText(sellerWaId, botText(sellerLocale, 'live', { days: LISTING_DAYS, url })), {
        key: 'listingLive',
        locale: sellerLocale,
        parameters: [String(LISTING_DAYS), url],
      }),
    reviewer &&
      !submission.createdByAdmin &&
      sendWithTemplateFallback(
        reviewer,
        () =>
          sendText(
            reviewer,
            [
              `🟢 Nuevo producto online: ${title} (${planName})`,
              url,
              submission.crossPostFacebook ? '📌 Publicar también en Facebook' : '',
              submission.crossPostWallapop ? '📌 Publicar también en Wallapop' : '',
            ]
              .filter(Boolean)
              .join('\n')
          ),
        { key: 'adminNewListing', locale: 'es', parameters: [title, planName, url, crossPosts || '—'] }
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
  const fee: FeeRecord = { method: payment.provider === 'Stripe' ? 'stripe' : 'paypal', amount: payment.amountPaid };
  const product = await goLive(submission, ['AWAITING_PAYMENT'], `${payment.provider}:${payment.paymentId}`, fee);
  return product ? 'published' : 'already-published';
}

export type AdminPaymentOutcome = 'published' | 'no-consent' | 'not-waiting';

/** "Pagado": the admin got the fee by Bizum or in cash, books it and puts the listing online. */
export async function publishPaidByAdmin(submissionId: string, plan: ListingPlan, fee: FeeRecord & { method: 'bizum' | 'cash' }): Promise<AdminPaymentOutcome> {
  const waiting = await prisma.submission.findFirst({ where: { id: submissionId, status: 'AWAITING_PAYMENT' }, include: { seller: true } });
  if (!waiting) return 'not-waiting';
  if (lacksConsent(waiting)) return 'no-consent';
  const submission = await prisma.submission.update({ where: { id: submissionId }, data: { plan }, include: { seller: true } });
  const product = await goLive(submission, ['AWAITING_PAYMENT'], fee.method === 'bizum' ? 'Bizum' : 'Efectivo', fee);
  return product ? 'published' : 'not-waiting';
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

/**
 * An expired listing comes back from what it kept: online for a new period if it was live before, waiting for its
 * payment again if it never was. Null when it isn't expired (any more).
 */
export async function enableListing(submissionId: string) {
  const submission = await prisma.submission.findFirst({ where: { id: submissionId, status: 'EXPIRED' }, include: { seller: true } });
  if (!submission) return null;
  if (!submission.paidAt) {
    // No sentAt: the 48 hours start again when the admin sends the link.
    const { count } = await prisma.submission.updateMany({ where: { id: submissionId, status: 'EXPIRED' }, data: { status: 'AWAITING_PAYMENT', sentAt: null } });
    return count > 0 ? ('waiting' as const) : null;
  }
  return (await goLive(submission, ['EXPIRED'], 'Admin')) ? ('live' as const) : null;
}

/** A live listing leaves the shop (sold, cancelled or expired); the submission keeps the record. */
export async function takeDown(submissionId: string, status: 'SOLD' | 'CANCELLED' | 'EXPIRED') {
  const submission = await prisma.submission.update({ where: { id: submissionId }, data: { status } });
  // Showcase mode shows every product, sold out or not, so the product itself goes.
  if (submission.productId) await prisma.product.delete({ where: { id: submission.productId } }).catch(() => {});
  revalidatePath('/');
}
