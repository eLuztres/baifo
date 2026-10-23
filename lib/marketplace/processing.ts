import { prisma } from '@/db/prisma';
import { getCategoryOptions } from '@/lib/actions/category.actions';
import { sendText } from '@/lib/whatsapp-cloud/client';
import { enhancePhoto, writeListing } from './ai';
import { ADMIN_WHATSAPP_NUMBER, MAX_PROCESSING_ATTEMPTS } from './config';
import { fetchImage, storeWhatsappPhoto, uploadImage } from './media';
import { parsePrice } from './price';
import { sendForReview } from './review';

// A submission still PROCESSING after this long counts as stuck, so the cron starts it again.
export const STUCK_AFTER_MS = 10 * 60 * 1000;

/**
 * Photos → UploadThing → AI photo → AI text → review. Every step saves its result, so a retry
 * (after a crash or timeout) continues where the last run stopped instead of paying the AI twice.
 */
export async function processSubmission(submissionId: string) {
  let submission = await prisma.submission.findUnique({ where: { id: submissionId } });
  if (!submission || submission.status !== 'PROCESSING') return;

  try {
    if (submission.mediaIds.length > 0) {
      const stored = await Promise.all(submission.mediaIds.map((mediaId) => storeWhatsappPhoto(mediaId, submissionId)));
      submission = await prisma.submission.update({
        where: { id: submissionId },
        data: { rawImages: [...submission.rawImages, ...stored], mediaIds: [] },
      });
    }

    const original = submission.rawImages[0];
    if (!original) throw new Error('No photo to work with');
    const photo = await fetchImage(original);

    if (submission.images.length === 0) {
      const enhanced = await uploadImage(await enhancePhoto(photo), `listing-${submissionId}`);
      submission = await prisma.submission.update({
        where: { id: submissionId },
        data: { images: [enhanced, ...submission.rawImages.slice(1)] },
      });
    }

    if (!submission.title) {
      const categories = (await getCategoryOptions('es')).map((category) => category.name);
      const text = await writeListing(photo, submission.rawText, categories);
      submission = await prisma.submission.update({
        where: { id: submissionId },
        data: {
          title: text.title,
          description: text.descriptionEs,
          descriptionEn: text.descriptionEn,
          category: text.category,
          // What the seller asked for wins over the AI's suggestion.
          price: parsePrice(submission.rawText) ?? (text.price ? text.price.toFixed(2) : null),
        },
      });
    }

    submission = await prisma.submission.update({ where: { id: submissionId }, data: { status: 'IN_REVIEW', lastError: null } });
    await sendForReview(submission);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const failed = await prisma.submission.update({
      where: { id: submissionId },
      data: { attempts: { increment: 1 }, lastError: message.slice(0, 500) },
    });
    console.error(`Submission ${submissionId} failed (attempt ${failed.attempts})`, error);
    if (failed.attempts >= MAX_PROCESSING_ATTEMPTS && ADMIN_WHATSAPP_NUMBER) {
      await sendText(ADMIN_WHATSAPP_NUMBER, `⚠️ No pude preparar el anuncio ${submissionId}: ${message.slice(0, 300)}`).catch(() => {});
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
