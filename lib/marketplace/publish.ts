import { revalidatePath } from 'next/cache';
import slugify from 'slugify';
import { prisma } from '@/db/prisma';
import { DEFAULT_PRICE_MODES } from '@/lib/constants';
import { startOfShopDay } from '@/lib/event-date';
import { getShopLocale } from '@/lib/i18n-server';
import { getDefaultPlaceId } from '@/lib/places';
import { sendText } from '@/lib/whatsapp-cloud/client';
import type { Seller, Submission, SubmissionStatus } from '@prisma/client';
import { ADMIN_WHATSAPP_NUMBER, LISTING_DAYS, productUrl, RELISTABLE, type ListingPlan } from './config';
import { allCategoryRefs, categoryName, FALLBACK_CATEGORY_SLUG, findCategories, getListingCategories, toProductTranslations } from './catalog';
import { botText, localeOf } from './messages';
import { lacksConsent } from './listing-payment';
import { sendWithTemplateFallback } from './templates';

const DAY_MS = 24 * 60 * 60 * 1000;

type SubmissionWithSeller = Submission & { seller: Seller };

/** A fee to book together with the listing going live. */
interface FeeRecord {
  method: 'bizum' | 'cash';
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
  const now = Date.now();
  // An event stays until its day is over (the daily run finishes it then); an admin's "Online hasta" holds for its first
  // period; else the shop's LISTING_DAYS.
  const eventEnd = submission.type === 'EVENT' && submission.startsAt ? new Date(startOfShopDay(submission.startsAt).getTime() + DAY_MS) : null;
  const chosenEnd = !submission.paidAt && submission.expiresAt && submission.expiresAt.getTime() > now ? submission.expiresAt : null;
  const expiresAt = eventEnd ?? chosenEnd ?? new Date(now + LISTING_DAYS * DAY_MS);
  const title = submission.title ?? 'Anuncio';
  const allCategories = await getListingCategories();
  const chosen = findCategories(allCategories, submission.categories);
  const categories = chosen.length > 0 ? chosen : findCategories(allCategories, [FALLBACK_CATEGORY_SLUG]);
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
        category: categoryName(categories[0], getShopLocale()) || 'Varios',
        condition: submission.condition,
        images: submission.images.length > 0 ? submission.images : submission.rawImages,
        brand: submission.seller.name ?? 'Particular',
        description: submission.description ?? '',
        translations: toProductTranslations(submission.translations),
        stock: 1,
        // 0: no price, or a free event.
        price: submission.price ?? 0,
        priceMode: submission.priceMode ?? (submission.price ? DEFAULT_PRICE_MODES[submission.type] : 'NONE'),
        type: submission.type,
        serviceType: submission.serviceType,
        startsAt: submission.startsAt,
        address: submission.address,
        placeId,
        mercadilloId: submission.mercadilloId,
        isFeatured: plan === 'big',
        contactPhone,
        sellerId: submission.sellerId,
        expiresAt,
        categories: { connect: allCategoryRefs(categories) },
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
    // An OK the admin confirmed means the person already knows: no message for it.
    isPhoneNumber(sellerWaId) &&
      submission.consentSource !== 'admin-confirmed' &&
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
  ]);
  return product;
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

/** The person gave their OK on their private page: there's no fee, so it goes online at once. */
export async function publishConfirmed(submissionId: string) {
  const submission = await prisma.submission.findUnique({ where: { id: submissionId }, include: { seller: true } });
  return submission ? goLive(submission, ['AWAITING_PAYMENT'], 'Persona') : null;
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
 * An offline listing comes back from what it kept: online for a new period if it was live before, waiting for its
 * payment again if it never was. Null when it is no longer offline.
 */
export async function enableListing(submissionId: string) {
  const submission = await prisma.submission.findFirst({ where: { id: submissionId, status: { in: RELISTABLE } }, include: { seller: true } });
  if (!submission) return null;
  if (!submission.paidAt) {
    // No sentAt: the 48 hours start again when the admin sends the link.
    const { count } = await prisma.submission.updateMany({
      where: { id: submissionId, status: { in: RELISTABLE } },
      data: { status: 'AWAITING_PAYMENT', sentAt: null },
    });
    return count > 0 ? ('waiting' as const) : null;
  }
  return (await goLive(submission, RELISTABLE, 'Admin')) ? ('live' as const) : null;
}

export type RenewalOutcome = 'renewed' | 'not-renewable';

/**
 * "Renovación pagada": the fee for another period came by Bizum or in cash. A live listing stays online LISTING_DAYS
 * longer than it would have; a paid one that has ended comes back for a new period, with what it kept.
 */
export async function renewPaidByAdmin(submissionId: string, fee: FeeRecord & { method: 'bizum' | 'cash' }): Promise<RenewalOutcome> {
  const submission = await prisma.submission.findFirst({
    where: { id: submissionId, paidAt: { not: null }, status: { in: ['LIVE', 'EXPIRED'] } },
    include: { seller: true },
  });
  if (!submission) return 'not-renewable';
  const paymentLabel = fee.method === 'bizum' ? 'Bizum' : 'Efectivo';
  if (submission.status === 'EXPIRED') return (await goLive(submission, ['EXPIRED'], paymentLabel, fee)) ? 'renewed' : 'not-renewable';

  const now = new Date();
  const currentEnd = submission.expiresAt;
  const expiresAt = new Date(Math.max(currentEnd?.getTime() ?? 0, now.getTime()) + LISTING_DAYS * DAY_MS);
  const title = submission.title ?? 'Anuncio';
  const isRenewed = await prisma.$transaction(async (tx) => {
    // The old end in the filter: a second tap on the same payment finds nothing to renew.
    const { count } = await tx.submission.updateMany({
      where: { id: submission.id, status: 'LIVE', expiresAt: currentEnd },
      data: { expiresAt, remindedAt: null, paidAt: now, paymentProvider: paymentLabel },
    });
    if (count === 0) return false;
    if (submission.productId) await tx.product.updateMany({ where: { id: submission.productId }, data: { expiresAt } });
    await tx.listingFee.create({
      data: { submissionId: submission.id, title, method: fee.method, amount: fee.amount, payCode: submission.payCode, recordedBy: fee.recordedBy },
    });
    return true;
  });
  if (!isRenewed) return 'not-renewable';

  revalidatePath('/');
  const { waId } = submission.seller;
  if (isPhoneNumber(waId)) {
    const date = expiresAt.toLocaleDateString('es-ES', { timeZone: 'Atlantic/Canary' });
    await sendText(waId, botText(localeOf(waId), 'renewed', { title, date })).catch(() => {});
  }
  return 'renewed';
}

/** A live listing leaves the shop (sold, cancelled, expired, finished or hidden); the submission keeps the record. */
export async function takeDown(submissionId: string, status: 'SOLD' | 'CANCELLED' | 'EXPIRED' | 'FINISHED' | 'HIDDEN') {
  const submission = await prisma.submission.update({ where: { id: submissionId }, data: { status } });
  // Showcase mode shows every product, sold out or not, so the product itself goes.
  if (submission.productId) await prisma.product.delete({ where: { id: submission.productId } }).catch(() => {});
  revalidatePath('/');
}
