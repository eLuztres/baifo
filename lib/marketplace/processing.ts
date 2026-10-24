import { prisma } from '@/db/prisma';
import { getCategoryOptions } from '@/lib/actions/category.actions';
import { sendText } from '@/lib/whatsapp-cloud/client';
import { enhancePhoto, writeListing } from './ai';
import { MAX_PROCESSING_ATTEMPTS } from './config';
import { fetchImage, storeWhatsappPhoto, uploadImage } from './media';
import { parsePrice } from './price';
import { reviewerOf, sendForReview } from './review';

// A submission still PROCESSING after this long counts as stuck, so the cron starts it again.
export const STUCK_AFTER_MS = 10 * 60 * 1000;

/** The AI makes at most this many shop pictures per listing; more photos stay as they are. */
export const MAX_ENHANCED_PHOTOS = 4;

const findSubmission = (id: string) => prisma.submission.findUnique({ where: { id }, include: { seller: true } });

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

    if (submission.images.length === 0) {
      // Every photo becomes a clean shop picture (in parallel, so several cost no extra waiting).
      const enhanced = await Promise.all(
        originals.slice(0, MAX_ENHANCED_PHOTOS).map(async (url, index) => {
          const photo = index === 0 ? firstPhoto : await fetchImage(url);
          return uploadImage(await enhancePhoto(photo), `listing-${submissionId}-${index}`);
        })
      );
      await prisma.submission.update({
        where: { id: submissionId },
        data: { images: [...enhanced, ...originals.slice(MAX_ENHANCED_PHOTOS)] },
      });
      submission = (await findSubmission(submissionId))!;
    }

    if (!submission.title) {
      const categories = (await getCategoryOptions('es')).map((category) => category.name);
      const text = await writeListing(firstPhoto, submission.rawText, categories);
      await prisma.submission.update({
        where: { id: submissionId },
        data: {
          title: text.title,
          description: text.descriptionEs,
          descriptionEn: text.descriptionEn,
          category: text.category,
          // What the seller asked for wins over the AI's suggestion.
          price: submission.price ?? parsePrice(submission.rawText) ?? (text.price ? text.price.toFixed(2) : null),
        },
      });
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
    const reviewer = reviewerOf(submission.seller.waId);
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
