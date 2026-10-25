import { prisma } from '@/db/prisma';
import type { ProductKind } from '@/lib/constants';
import { getEnabledLocales, getShopLocale } from '@/lib/i18n-server';
import { sendText } from '@/lib/whatsapp-cloud/client';
import { enhancePhoto, writeListing } from './ai';
import { getListingCategories } from './catalog';
import { ADMIN_WHATSAPP_NUMBER, MAX_PROCESSING_ATTEMPTS } from './config';
import { fetchImage, storeWhatsappPhoto, uploadImage } from './media';
import { parsePrice } from './price';
import { sendForReview } from './review';

// A submission still PROCESSING after this long counts as stuck, so the cron starts it again.
export const STUCK_AFTER_MS = 10 * 60 * 1000;

/** The AI makes at most this many shop pictures per listing; more photos stay as they are. */
export const MAX_ENHANCED_PHOTOS = 4;

const findSubmission = (id: string) => prisma.submission.findUnique({ where: { id }, include: { seller: true } });

/** Every photo becomes a clean shop picture (in parallel, so several cost no extra waiting). */
async function makeShopPictures(submissionId: string, originals: string[], kind: ProductKind, firstPhoto?: Buffer) {
  const enhanced = await Promise.all(
    originals.slice(0, MAX_ENHANCED_PHOTOS).map(async (url, index) => {
      const photo = index === 0 && firstPhoto ? firstPhoto : await fetchImage(url);
      return uploadImage(await enhancePhoto(photo, kind), `listing-${submissionId}-${index}`);
    })
  );
  await prisma.submission.update({
    where: { id: submissionId },
    data: { images: [...enhanced, ...originals.slice(MAX_ENHANCED_PHOTOS)], lastError: null },
  });
}

/** Step 1 of a listing the admin creates: only the shop pictures; the text waits for the admin's description. */
export async function makeListingPictures(submissionId: string) {
  const submission = await findSubmission(submissionId);
  if (!submission || submission.status !== 'COLLECTING' || submission.images.length > 0) return;
  try {
    if (submission.rawImages.length === 0) throw new Error('No photo to work with');
    await makeShopPictures(submissionId, submission.rawImages, submission.kind as ProductKind);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await prisma.submission.update({ where: { id: submissionId }, data: { attempts: { increment: 1 }, lastError: message.slice(0, 500) } });
    console.error(`Pictures of submission ${submissionId} failed`, error);
  }
}

/**
 * Photos → UploadThing → AI pictures → AI text → review. Every step saves its result, so a retry
 * (after a crash or timeout) continues where the last run stopped instead of paying the AI twice.
 * Listings the admin made on /admin/listings/new skip the WhatsApp review: the admin sees them there.
 */
export async function processSubmission(submissionId: string) {
  let submission = await findSubmission(submissionId);
  if (!submission || submission.status !== 'PROCESSING') return;

  try {
    if (submission.mediaIds.length > 0) {
      const stored = await Promise.all(submission.mediaIds.map((mediaId) => storeWhatsappPhoto(mediaId, submissionId)));
      await prisma.submission.update({
        where: { id: submissionId },
        data: { rawImages: [...submission.rawImages, ...stored], mediaIds: [] },
      });
      submission = (await findSubmission(submissionId))!;
    }

    const originals = submission.rawImages;
    if (originals.length === 0) throw new Error('No photo to work with');
    const firstPhoto = await fetchImage(originals[0]);

    // The text goes first: it takes seconds, so the admin sees the category while the pictures are made.
    if (!submission.title) {
      const shopLocale = getShopLocale();
      const locales = [shopLocale, ...getEnabledLocales().filter((locale) => locale !== shopLocale)];
      const kind = submission.kind as ProductKind;
      const text = await writeListing(firstPhoto, submission.rawText, await getListingCategories(kind), locales, kind);
      const { [shopLocale]: own, ...others } = text.texts;
      await prisma.submission.update({
        where: { id: submissionId },
        data: {
          title: own?.title,
          description: own?.description,
          translations: others,
          category: text.category,
          condition: text.condition,
          // What the seller asked for wins over the AI's suggestion; a service never has a price, even if the notes name one.
          price: kind === 'service' ? null : (submission.price ?? parsePrice(submission.rawText) ?? (text.price ? text.price.toFixed(2) : null)),
        },
      });
      submission = (await findSubmission(submissionId))!;
    }

    if (submission.images.length === 0) {
      await makeShopPictures(submissionId, originals, submission.kind as ProductKind, firstPhoto);
      submission = (await findSubmission(submissionId))!;
    }

    submission = await prisma.submission.update({
      where: { id: submissionId },
      data: { status: 'IN_REVIEW', lastError: null },
      include: { seller: true },
    });
    if (!submission.createdByAdmin) await sendForReview(submission);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const failed = await prisma.submission.update({
      where: { id: submissionId },
      data: { attempts: { increment: 1 }, lastError: message.slice(0, 500) },
    });
    console.error(`Submission ${submissionId} failed (attempt ${failed.attempts})`, error);
    const reviewer = ADMIN_WHATSAPP_NUMBER;
    if (failed.attempts >= MAX_PROCESSING_ATTEMPTS && reviewer && !submission.createdByAdmin) {
      await sendText(reviewer, `⚠️ No pude preparar el anuncio ${submissionId}: ${message.slice(0, 300)}`).catch(() => {});
    }
  }
}

/** Submissions whose last run died or failed, for the cron to try again. */
export async function findStuckSubmissions() {
  return prisma.submission.findMany({
    where: {
      status: 'PROCESSING',
      attempts: { lt: MAX_PROCESSING_ATTEMPTS },
      updatedAt: { lt: new Date(Date.now() - STUCK_AFTER_MS) },
    },
    select: { id: true },
  });
}
