// The printed listing (/imprimir): how many fit on a sheet, how much of the text, and how big the photos are.

export const PRINT_COPIES = [1, 2, 4] as const;
export type PrintCopies = (typeof PRINT_COPIES)[number];

export const MAX_PRINT_PHOTOS = 5;

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

/** The biggest equal size for `count` 3:4 photos in a box, trying every number of rows; returns their width and columns. */
export function fitPhotoGrid(width: number, height: number, count: number, gap: number) {
  let best = { width: 0, columns: Math.max(count, 1) };
  for (let rows = 1; rows <= count; rows++) {
    const columns = Math.ceil(count / rows);
    const photoWidth = Math.min((width - (columns - 1) * gap) / columns, ((height - (rows - 1) * gap) / rows) * (3 / 4));
    if (photoWidth > best.width) best = { width: photoWidth, columns };
  }
  return best;
}

/** The smallest the photos may get: all five in one row across the sheet. */
export const minPhotoWidth = (width: number, gap: number) => (width - (MAX_PRINT_PHOTOS - 1) * gap) / MAX_PRINT_PHOTOS;
