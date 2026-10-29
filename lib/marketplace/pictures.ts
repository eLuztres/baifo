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
