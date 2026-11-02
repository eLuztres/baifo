import { isVideoUrl, videoPoster } from '@/lib/video';

/** A listing's photos as stored: the originals and, at the same index, the AI picture of each ('' where none). */
export interface PicturePairs {
  rawImages: string[];
  aiImages: string[];
}

/** The other version of a picture in use: its original photo for an AI picture, or the reverse. */
export function pictureCounterpart({ rawImages, aiImages }: PicturePairs, url: string): { isAi: boolean; other: string } | undefined {
  const aiIndex = aiImages.indexOf(url);
  if (aiIndex >= 0 && rawImages[aiIndex]) return { isAi: true, other: rawImages[aiIndex] };
  const ai = aiImages[rawImages.indexOf(url)];
  return ai ? { isAi: false, other: ai } : undefined;
}

/** The first picture is the cover of cards and messages: a video only with a still frame to show there. */
export const canBeMain = (url: string) => !isVideoUrl(url) || Boolean(videoPoster(url));

/** The pictures with one moved to another place; unchanged when the place doesn't exist or a new first one can't be the main one. */
export function movePicture(images: string[], from: number, to: number): string[] {
  if (to < 0 || to >= images.length || from === to) return images;
  const moved = [...images];
  const [picture] = moved.splice(from, 1);
  moved.splice(to, 0, picture);
  return moved[0] === images[0] || canBeMain(moved[0]) ? moved : images;
}

/** Whether the picture at `index` gets the AI badge. Older AI listings have no pairs, so only their cover is marked. */
export function isAiPicture(listing: PicturePairs & { images: string[]; usesAi: boolean }, url: string, index: number): boolean {
  if (listing.aiImages.length > 0) return Boolean(pictureCounterpart(listing, url)?.isAi);
  return listing.usesAi && index === 0 && listing.images.length > 0;
}

/** The picture tabs of a listing being made: the uploads with their AI version at the same index, and the pictures in use. */
export interface PictureSet extends PicturePairs {
  images: string[];
}

/** An uploaded photo or video becomes a new tab, used as it is. */
export const addUpload = ({ images, rawImages, aiImages }: PictureSet, url: string): PictureSet => ({
  images: [...images, url],
  rawImages: [...rawImages, url],
  aiImages: [...aiImages, ''],
});

/** A picture made from words alone: a new tab without an original. */
export const addCreated = (set: PictureSet, url: string): PictureSet => ({ ...set, images: [...set.images, url] });

/** The tab showing `shown` gets a new AI version, which is used right away; an upload keeps its original to switch back to. */
export function setAiVersion(set: PictureSet, shown: string, ai: string): PictureSet {
  const images = set.images.map((url) => (url === shown ? ai : url));
  const pair = pictureCounterpart(set, shown);
  const raw = pair ? (pair.isAi ? pair.other : shown) : set.rawImages.includes(shown) ? shown : undefined;
  if (!raw) return { ...set, images };
  const index = set.rawImages.indexOf(raw);
  return { ...set, images, aiImages: set.aiImages.map((url, at) => (at === index ? ai : url)) };
}

/** The tab shows its other version: the original instead of the AI picture, or the reverse. */
export function switchVersion(set: PictureSet, shown: string): PictureSet {
  const pair = pictureCounterpart(set, shown);
  return pair ? { ...set, images: set.images.map((url) => (url === shown ? pair.other : url)) } : set;
}

/** The tab goes, with its original and AI version. */
export function removePicture(set: PictureSet, shown: string): PictureSet {
  const pair = pictureCounterpart(set, shown);
  const raw = pair ? (pair.isAi ? pair.other : shown) : shown;
  const index = set.rawImages.indexOf(raw);
  const images = set.images.filter((url) => url !== shown);
  if (index < 0) return { ...set, images };
  return { images, rawImages: set.rawImages.filter((_, at) => at !== index), aiImages: set.aiImages.filter((_, at) => at !== index) };
}

/** The photo the AI changes for a tab: the upload behind it, or the made picture itself. */
export function photoBehind(set: PicturePairs, shown: string): string {
  const pair = pictureCounterpart(set, shown);
  return pair?.isAi ? pair.other : shown;
}
