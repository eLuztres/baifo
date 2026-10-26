import { prisma } from '@/db/prisma';
import type { ProductKind } from '@/lib/constants';
import { getEnabledLocales, getShopLocale } from '@/lib/i18n-server';
import { getShopPlaces } from '@/lib/places';
import { isVideoUrl, mediaUrl } from '@/lib/video';
import { sendText } from '@/lib/whatsapp-cloud/client';
import { createPicture, enhancePhoto, writeListing } from './ai';
import { getListingCategories } from './catalog';
import { ADMIN_WHATSAPP_NUMBER, MAX_PROCESSING_ATTEMPTS } from './config';
import { fetchImage, storeWhatsappPhoto, uploadImage } from './media';
import { cleanUpVideo } from './video-cleanup';
import { parsePrice } from './price';
import { sendForReview } from './review';

// A submission still PROCESSING after this long counts as stuck, so the cron starts it again.
export const STUCK_AFTER_MS = 10 * 60 * 1000;

/** The AI makes a shop picture of every photo, up to as many as the uploader takes; the admin picks either version per photo. */
export const MAX_ENHANCED_PHOTOS = 8;

const findSubmission = (id: string) => prisma.submission.findUnique({ where: { id }, include: { seller: true } });

const photosOf = (originals: string[]) => originals.filter((url) => !isVideoUrl(url));
const videosOf = (originals: string[]) => originals.filter(isVideoUrl);

/** Every photo becomes a clean shop picture (in parallel, so several cost no extra waiting); videos stay as they are, after the pictures. */
async function makeShopPictures(submissionId: string, originals: string[], kind: ProductKind, firstPhoto?: Buffer) {
  const photos = photosOf(originals);
  const enhanced = await Promise.all(
    photos.slice(0, MAX_ENHANCED_PHOTOS).map(async (url, index) => {
      const photo = index === 0 && firstPhoto ? firstPhoto : await fetchImage(url);
      return uploadImage(await enhancePhoto(photo, kind), `listing-${submissionId}-${index}`);
    })
  );
  await prisma.submission.update({
    where: { id: submissionId },
    // The AI pictures go first in use; aiImages keeps each one next to its original, so the admin can switch back.
    data: {
      images: [...enhanced, ...photos.slice(MAX_ENHANCED_PHOTOS), ...videosOf(originals)],
      aiImages: originals.map((url) => enhanced[photos.indexOf(url)] ?? ''),
      lastError: null,
    },
  });
}

/** No photo at all: the AI makes one picture from the written listing, the cover before any video. It has no original, so nothing to switch back to. */
async function makeTextPicture(submissionId: string, text: { title: string; description: string }, kind: ProductKind, isWanted: boolean, videos: string[]) {
  const picture = await uploadImage(await createPicture(text, kind, isWanted), `listing-${submissionId}-0`);
  await prisma.submission.update({ where: { id: submissionId }, data: { images: [picture, ...videos], lastError: null } });
}

type SubmissionMedia = { rawImages: string[]; images: string[]; aiImages: string[] };

/** Each video in use gets its clean-up, kept next to the original in aiImages, so the admin can switch back like with a picture. */
async function cleanUpVideos(submissionId: string, { rawImages, images, aiImages }: SubmissionMedia) {
  const pending = rawImages.filter((url, index) => isVideoUrl(url) && !aiImages[index] && images.includes(url));
  if (pending.length === 0) return;
  const cleaned = new Map(
    await Promise.all(
      pending.map(async (url, index) => {
        try {
          const video = await cleanUpVideo(await fetchImage(url));
          return [url, mediaUrl(await uploadImage(video, `listing-${submissionId}-video-${index}`, 'video/mp4'), 'video/mp4')] as const;
        } catch (error) {
          // The original video stays: a failed clean-up never holds up the listing.
          console.error(`Video ${url} of submission ${submissionId} not cleaned up`, error);
          return [url, ''] as const;
        }
      })
    )
  );
  await prisma.submission.update({
    where: { id: submissionId },
    data: {
      images: images.map((url) => cleaned.get(url) || url),
      aiImages: rawImages.map((url, index) => cleaned.get(url) || aiImages[index] || ''),
    },
  });
}

/** Step 1 of a listing the admin creates: only the shop pictures; the text waits for the admin's description. */
export async function makeListingPictures(submissionId: string) {
  const submission = await findSubmission(submissionId);
  if (!submission || submission.status !== 'COLLECTING' || submission.images.length > 0) return;
  try {
    if (submission.rawImages.length === 0) throw new Error('No photo to work with');
    // Only videos: the picture is made from the text, after the description.
    if (photosOf(submission.rawImages).length === 0) return;
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
    // Only the admin starts a listing without a photo (described step by step); the bot always has one.
    if (originals.length === 0 && !submission.createdByAdmin) throw new Error('No photo to work with');
    const [firstPhotoUrl] = photosOf(originals);
    const firstPhoto = firstPhotoUrl ? await fetchImage(firstPhotoUrl) : null;

    // The text goes first: it takes seconds, so the admin sees the category while the pictures are made.
    if (!submission.title) {
      const shopLocale = getShopLocale();
      const locales = [shopLocale, ...getEnabledLocales().filter((locale) => locale !== shopLocale)];
      const kind = submission.kind as ProductKind;
      // 'original': the admin's own words stay; the AI only translates them and still reads category, condition and price.
      const kept = submission.textMode === 'original' ? { title: submission.originalTitle ?? undefined, description: submission.rawText } : undefined;
      const [categories, places] = await Promise.all([getListingCategories(kind, submission.isWanted), getShopPlaces(shopLocale)]);
      const livePlaces = places.filter((place) => place.isLive);
      const text = await writeListing(firstPhoto, submission.rawText, categories, locales, kind, kept, submission.isWanted, livePlaces);
      // A place the admin already set stays; else the town the AI read, else the first live place.
      const placeId = submission.placeId ?? (livePlaces.find((place) => place.slug === text.place) ?? livePlaces[0])?.id ?? null;
      const { [shopLocale]: own, ...others } = text.texts;
      await prisma.submission.update({
        where: { id: submissionId },
        data: {
          title: own?.title,
          description: own?.description,
          translations: others,
          textVersions: { [submission.textMode]: text.texts },
          category: text.category,
          condition: text.condition,
          placeId,
          // What the seller asked for wins over the AI's suggestion; a service never has a price, even if the notes name one.
          price: kind === 'service' ? null : (submission.price ?? parsePrice(submission.rawText) ?? (text.price ? text.price.toFixed(2) : null)),
        },
      });
      submission = (await findSubmission(submissionId))!;
    }

    if (submission.images.length === 0) {
      if (firstPhoto) await makeShopPictures(submissionId, originals, submission.kind as ProductKind, firstPhoto);
      else await makeTextPicture(submissionId, { title: submission.title ?? '', description: submission.description ?? '' }, submission.kind as ProductKind, submission.isWanted, videosOf(originals));
      submission = (await findSubmission(submissionId))!;
    }

    // Videos last, as they take longest; a listing made without AI keeps them as uploaded.
    if (submission.usesAi) await cleanUpVideos(submissionId, submission);

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
