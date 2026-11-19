import { isVideoUrl, pictureOf, throughSite } from '@/lib/video';

// The printed listing (/imprimir): how many fit on a sheet, which photo and how much of the text.

export const PRINT_COPIES = [1, 2, 4] as const;
export type PrintCopies = (typeof PRINT_COPIES)[number];

// A printed selección: its first sheet also holds its name and QR, so fewer listings fit there.
export const SELECTION_FIRST_SHEET = 8;
export const SELECTION_NEXT_SHEET = 10;

/** A selección's listings split into A4 sheets; with none, one sheet all the same. */
export function selectionSheets<T>(listings: T[], first = SELECTION_FIRST_SHEET, next = SELECTION_NEXT_SHEET): T[][] {
  const sheets = [listings.slice(0, first)];
  for (let start = first; start < listings.length; start += next) sheets.push(listings.slice(start, start + next));
  return sheets;
}

/** ?copias=2 → 2; anything else is the whole sheet. */
export const parseCopies = (param?: string): PrintCopies => PRINT_COPIES.find((copies) => String(copies) === param) ?? 1;

/** The listing's media one can print: photos, and videos that have a still frame. */
export const printableMedia = (media: string[]) => media.filter((url) => pictureOf(url));

/** Those as printed: through this site as on the listing (#556), a video as its still frame. */
export const printPhotos = (media: string[]) => printableMedia(media).map((url) => ({ src: throughSite(pictureOf(url) ?? url), isVideo: isVideoUrl(url) }));

/** ?foto=2 → the third photo; anything that isn't one of them is the first. */
export function parsePhoto(param: string | undefined, count: number) {
  const index = Number(param);
  return Number.isInteger(index) && index >= 0 && index < count ? index : 0;
}

/** A photo's name in a link: its file name, the same whichever language's pictures it is among. */
export const photoName = (url: string) => url.split('#')[0].split('/').pop() ?? '';

/** The photo a link's ?foto= names among `media`: by its file name, or by its place in older links (?foto=2, the third). */
export function namedPhoto(param: string | undefined, media: string[]): string | undefined {
  return media.find((url) => photoName(url) === param) ?? (param && /^\d+$/.test(param) ? media[Number(param)] : undefined);
}

// Half and quarter sheets print the text too small to read when it is long: they keep its start and send to the QR.
const TEXT_LIMITS: Record<PrintCopies, number> = { 1: Infinity, 2: 900, 4: 450 };

/** The description for this many copies per sheet, cut at a word when too long. */
export function printDescription(text: string, copies: PrintCopies): { text: string; isCut: boolean } {
  const limit = TEXT_LIMITS[copies];
  if (text.length <= limit) return { text, isCut: false };
  const cut = text.slice(0, limit);
  const lastSpace = cut.search(/\s\S*$/);
  return { text: `${(lastSpace > limit / 2 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`, isCut: true };
}

/** Paragraphs of a description: a blank line on paper is only a small gap. */
export const printParagraphs = (text: string) => text.split(/\n\s*\n/).map((paragraph) => paragraph.trim()).filter(Boolean);

