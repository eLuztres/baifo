import { prisma } from '@/db/prisma';
import { ANY_CONDITION, type ListingType } from '@/lib/constants';
import { getEnabledLocales, getShopLocale } from '@/lib/i18n-server';
import { aiErrorCode } from '@/lib/ai-errors';
import { fromShopDateTime } from '@/lib/event-date';
import { getShopPlaces } from '@/lib/places';
import { isVideoUrl, mediaUrl, videoPoster } from '@/lib/video';
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
type FoundSubmission = NonNullable<Awaited<ReturnType<typeof findSubmission>>>;

const photosOf = (originals: string[]) => originals.filter((url) => !isVideoUrl(url));
const videosOf = (originals: string[]) => originals.filter(isVideoUrl);
const toPrice = (amount: number | null) => (amount ? amount.toFixed(2) : null);
// Only videos: their still frames are what the AI makes the shop pictures from.
const stillsOf = (originals: string[]) => videosOf(originals).flatMap((url) => videoPoster(url) ?? []);
const hasPictureSource = (originals: string[]) => photosOf(originals).length > 0 || stillsOf(originals).length > 0;

/** An admin's photos get their pictures from makeListingPictures, started with the upload, while the admin writes.
    Nothing touched the listing for STUCK_AFTER_MS: that run is long dead, so another one makes them. */
const isUploadRunAlive = (submission: FoundSubmission) =>
  submission.createdByAdmin && submission.usesAi && hasPictureSource(submission.rawImages) && Date.now() - submission.updatedAt.getTime() < STUCK_AFTER_MS;

/** Every photo becomes a clean shop picture (in parallel, so several cost no extra waiting); videos stay as they are, after the pictures.
    known: AI pictures already made, next to their originals like aiImages; those photos aren't sent to the AI again.
    False when the admin changed the photos meanwhile: the run for the new ones saves theirs. */
async function makeShopPictures(submissionId: string, originals: string[], type: ListingType, wish: string | null, firstPhoto?: Buffer, known: string[] = []) {
  const photos = photosOf(originals);
  const sources = photos.length > 0 ? photos : stillsOf(originals);
  const enhanced = await Promise.all(
    sources.slice(0, MAX_ENHANCED_PHOTOS).map(async (url, index) => {
      const madeBefore = known[originals.indexOf(url)];
      if (madeBefore) return madeBefore;
      const photo = index === 0 && firstPhoto ? firstPhoto : await fetchImage(url);
      return uploadImage(await enhancePhoto(photo, type, wish), `listing-${submissionId}-${index}`);
    })
  );
  // Only into a listing still without pictures, from the photos and wish it still has: another run (upload, description, retry) may have finished first, and its pictures stay.
  const { count } = await prisma.submission.updateMany({
    where: { id: submissionId, rawImages: { equals: originals }, picturePrompt: wish, images: { isEmpty: true } },
    // The AI pictures go first in use; aiImages keeps each one next to its original, so the admin can switch back.
    data: {
      images: [...enhanced, ...photos.slice(MAX_ENHANCED_PHOTOS), ...videosOf(originals)],
      aiImages: originals.map((url) => enhanced[photos.indexOf(url)] ?? ''),
      lastError: null,
    },
  });
  return count > 0;
}

/** No photo at all: the AI makes one picture from the written listing, the cover before any video. It has no original, so nothing to switch back to. */
async function makeTextPicture(submissionId: string, text: { title: string; description: string }, type: ListingType, wish: string | null, videos: string[]) {
  const picture = await uploadImage(await createPicture(text, type, wish), `listing-${submissionId}-0`);
  await prisma.submission.updateMany({ where: { id: submissionId, images: { isEmpty: true } }, data: { images: [picture, ...videos], lastError: null } });
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
          // The cleaned-up video keeps the original's still frame as its cover.
          return [url, mediaUrl(await uploadImage(video, `listing-${submissionId}-video-${index}`, 'video/mp4'), 'video/mp4', videoPoster(url))] as const;
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

/** The AI's title, descriptions, category, condition and price, from the first photo and the seller's words; once. */
async function writeText(submission: FoundSubmission, firstPhoto: Buffer | null) {
  if (submission.title) return;
  const shopLocale = getShopLocale();
  const locales = [shopLocale, ...getEnabledLocales().filter((locale) => locale !== shopLocale)];
  // 'original': the admin's own words stay; the AI only translates them and still reads category, condition and price.
  // 'corrected': the same, with their spelling and grammar fixed first.
  const kept =
    submission.textMode === 'ai'
      ? undefined
      : { title: submission.originalTitle ?? undefined, description: submission.rawText, isCorrected: submission.textMode === 'corrected' };
  const [categories, places] = await Promise.all([getListingCategories(), getShopPlaces(shopLocale)]);
  const livePlaces = places.filter((place) => place.isLive);
  const text = await writeListing(firstPhoto, submission.rawText, categories, locales, submission.type, kept, livePlaces);
  // A place the admin already set stays; else the town the AI read. None named stays empty, unless there's only one.
  const placeId = submission.placeId ?? (livePlaces.find((place) => place.slug === text.place) ?? (livePlaces.length === 1 ? livePlaces[0] : null))?.id ?? null;
  const { [shopLocale]: own, ...others } = text.texts;
  const { type } = text;
  const isWanted = type === 'WANTED';
  // What the seller asked for wins over the AI's suggestion; a service's price is its "from" price, an event's its entry.
  // A wanted ad's amount in the notes is only one end of its budget, so the AI's range is used.
  const price = submission.price ?? (isWanted ? null : parsePrice(submission.rawText)) ?? toPrice(text.price);
  const priceMax = isWanted ? (submission.priceMax ?? toPrice(text.priceMax)) : null;
  await prisma.submission.update({
    where: { id: submission.id },
    data: {
      title: own?.title,
      shortTitle: own?.short,
      description: own?.description,
      translations: others,
      textVersions: { [submission.textMode]: text.texts },
      category: text.category,
      type,
      // "Any condition" only fits a wanted ad; an item for sale always is in one.
      condition: text.condition === ANY_CONDITION && !isWanted ? null : text.condition,
      placeId,
      price,
      priceMax: price && priceMax && Number(priceMax) > Number(price) ? priceMax : null,
      serviceType: type === 'SERVICE' ? text.serviceType : null,
      // A date the admin already set stays.
      startsAt: submission.startsAt ?? (type === 'EVENT' && text.startsAt ? fromShopDateTime(text.startsAt) : null),
      address: submission.address ?? (type === 'EVENT' ? text.address : null),
    },
  });
}

/** The shop pictures: from the photos (or video stills), else drawn from the listing's words. */
async function makePictures(submission: FoundSubmission, firstPhoto: Buffer | null) {
  if (submission.images.length > 0 || isUploadRunAlive(submission)) return;
  if (hasPictureSource(submission.rawImages)) return makeShopPictures(submission.id, submission.rawImages, submission.type, submission.picturePrompt, firstPhoto ?? undefined);
  // The AI's text once it is there (a retry), else the seller's own words, so the picture needn't wait for the text.
  const words = submission.title
    ? { title: submission.title, description: submission.description ?? '' }
    : { title: submission.originalTitle ?? '', description: submission.rawText };
  return makeTextPicture(submission.id, words, submission.type, submission.picturePrompt, videosOf(submission.rawImages));
}

/** Text and pictures are there: the videos cleaned up, then off to review. */
async function finishSubmission(submission: FoundSubmission) {
  // Videos last, as they take longest; a listing made without AI keeps them as uploaded.
  if (submission.usesAi) await cleanUpVideos(submission.id, submission);
  const finished = await prisma.submission.update({
    where: { id: submission.id },
    data: { status: 'IN_REVIEW', lastError: null },
    include: { seller: true },
  });
  if (!submission.createdByAdmin) await sendForReview(finished);
}

/** The pictures of a listing the admin creates, started with the upload: the admin writes the description meanwhile and
    its text is made at the same time. Whichever of the two is done last finishes the listing. */
export async function makeListingPictures(submissionId: string) {
  const submission = await findSubmission(submissionId);
  if (!submission || !['COLLECTING', 'PROCESSING'].includes(submission.status) || submission.images.length > 0) return;
  try {
    if (submission.rawImages.length === 0) throw new Error('No photo to work with');
    // Only videos without a still: the picture is drawn from the description, once it comes.
    if (!hasPictureSource(submission.rawImages)) return;
    if (!(await makeShopPictures(submissionId, submission.rawImages, submission.type, submission.picturePrompt, undefined, submission.aiImages))) return;
    const pictured = (await findSubmission(submissionId))!;
    if (pictured.status === 'PROCESSING' && pictured.title) await finishSubmission(pictured);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // An AI failure is kept as its code, so the admin's screen can say what happened in their language.
    await prisma.submission.update({ where: { id: submissionId }, data: { attempts: { increment: 1 }, lastError: (aiErrorCode(error) ?? message).slice(0, 500) } });
    console.error(`Pictures of submission ${submissionId} failed`, error);
  }
}

/**
 * Photos → UploadThing → AI pictures and AI text (at once) → review. Every step saves its result, so a retry
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
    // Without a photo the picture is made from the text; only an item for sale from the bot always has one.
    if (originals.length === 0 && !submission.createdByAdmin && submission.type === 'PRODUCT') throw new Error('No photo to work with');
    const [firstPhotoUrl] = photosOf(originals);
    const firstPhoto = firstPhotoUrl ? await fetchImage(firstPhotoUrl) : null;

    // Text and pictures at once, each saving its own fields. Only with no words at all the picture waits for the AI's text.
    if (submission.title || submission.rawText.trim()) await Promise.all([writeText(submission, firstPhoto), makePictures(submission, firstPhoto)]);
    else {
      await writeText(submission, firstPhoto);
      await makePictures((await findSubmission(submissionId))!, firstPhoto);
    }
    submission = (await findSubmission(submissionId))!;
    // The upload's run is still making the pictures: it finishes the listing once they're there.
    if (submission.images.length === 0) return;
    await finishSubmission(submission);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const failed = await prisma.submission.update({
      where: { id: submissionId },
      data: { attempts: { increment: 1 }, lastError: (aiErrorCode(error) ?? message).slice(0, 500) },
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
