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

/** Whether the picture at `index` gets the AI badge. Older AI listings have no pairs, so only their cover is marked. */
export function isAiPicture(listing: PicturePairs & { images: string[]; usesAi: boolean }, url: string, index: number): boolean {
  if (listing.aiImages.length > 0) return Boolean(pictureCounterpart(listing, url)?.isAi);
  return listing.usesAi && index === 0 && listing.images.length > 0;
}
