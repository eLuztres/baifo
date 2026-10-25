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
