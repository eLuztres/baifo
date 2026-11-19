import { isLocale, type Locale } from '@/lib/i18n-core';
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

/** Pictures meant for some languages only, by picture: { "<url>": ["es", "fr"] }; a picture not in it shows in every language. */
export type PictureLanguages = Record<string, Locale[]>;

/** The stored picture languages, keeping only real languages: the column is plain JSON. */
export function toPictureLanguages(value: unknown): PictureLanguages {
  if (!value || typeof value !== 'object') return {};
  const entries = Object.entries(value).map(([url, languages]) => [url, Array.isArray(languages) ? languages.filter(isLocale) : []] as const);
  return Object.fromEntries(entries.filter(([, languages]) => languages.length > 0));
}

/** The pictures a visitor reading `locale` sees: those for every language and those for theirs. With none for theirs,
    those of the first of `fallbacks` that has some; never none at all. */
export function localizePictures(images: string[], stored: unknown, locale: Locale, fallbacks: Locale[]): string[] {
  const languages = toPictureLanguages(stored);
  const isFor = (url: string, language: Locale) => Boolean(languages[url]?.includes(language));
  const shown = [locale, ...fallbacks].find((language) => images.some((url) => isFor(url, language)));
  const visible = images.filter((url) => !languages[url] || (shown && isFor(url, shown)));
  return visible.length > 0 ? visible : images;
}

/** The picture languages without `url`'s. */
const withoutLanguages = (languages: PictureLanguages, url: string): PictureLanguages => Object.fromEntries(Object.entries(languages).filter(([picture]) => picture !== url));

/** A tab now showing `to` instead of `from` keeps its languages. */
function moveLanguages(languages: PictureLanguages, from: string, to: string): PictureLanguages {
  const chosen = languages[from];
  return chosen ? { ...withoutLanguages(languages, from), [to]: chosen } : languages;
}

/** The picture tabs of a listing being made: the uploads with their AI version at the same index, the pictures in use and their languages. */
export interface PictureSet extends PicturePairs {
  images: string[];
  pictureLanguages: PictureLanguages;
}

/** An uploaded photo or video becomes a new tab, used as it is. */
export const addUpload = (set: PictureSet, url: string): PictureSet => ({
  ...set,
  images: [...set.images, url],
  rawImages: [...set.rawImages, url],
  aiImages: [...set.aiImages, ''],
});

/** A picture made from words alone: a new tab without an original. */
export const addCreated = (set: PictureSet, url: string): PictureSet => ({ ...set, images: [...set.images, url] });

/** The tab showing `shown` gets a new AI version, which is used right away; an upload keeps its original to switch back to. */
export function setAiVersion(set: PictureSet, shown: string, ai: string): PictureSet {
  const images = set.images.map((url) => (url === shown ? ai : url));
  const pair = pictureCounterpart(set, shown);
  const raw = pair ? (pair.isAi ? pair.other : shown) : set.rawImages.includes(shown) ? shown : undefined;
  const pictureLanguages = moveLanguages(set.pictureLanguages, shown, ai);
  if (!raw) return { ...set, images, pictureLanguages };
  const index = set.rawImages.indexOf(raw);
  return { ...set, images, pictureLanguages, aiImages: set.aiImages.map((url, at) => (at === index ? ai : url)) };
}

/** The tab shows its other version: the original instead of the AI picture, or the reverse. */
export function switchVersion(set: PictureSet, shown: string): PictureSet {
  const pair = pictureCounterpart(set, shown);
  if (!pair) return set;
  return { ...set, images: set.images.map((url) => (url === shown ? pair.other : url)), pictureLanguages: moveLanguages(set.pictureLanguages, shown, pair.other) };
}

/** The tab goes, with its original and AI version. */
export function removePicture(set: PictureSet, shown: string): PictureSet {
  const pair = pictureCounterpart(set, shown);
  const raw = pair ? (pair.isAi ? pair.other : shown) : shown;
  const index = set.rawImages.indexOf(raw);
  const images = set.images.filter((url) => url !== shown);
  const pictureLanguages = withoutLanguages(set.pictureLanguages, shown);
  if (index < 0) return { ...set, images, pictureLanguages };
  return { images, pictureLanguages, rawImages: set.rawImages.filter((_, at) => at !== index), aiImages: set.aiImages.filter((_, at) => at !== index) };
}

/** The tab's picture shows in every language again ("Todos"). */
export const showInEveryLanguage = (set: PictureSet, url: string): PictureSet => ({ ...set, pictureLanguages: withoutLanguages(set.pictureLanguages, url) });

/** The tab's picture shows in `language` too, or no longer; with none left, or all the shop's, it shows in every language. */
export function togglePictureLanguage(set: PictureSet, url: string, language: Locale, shopLanguages: Locale[]): PictureSet {
  const chosen = set.pictureLanguages[url] ?? [];
  const next = chosen.includes(language) ? chosen.filter((other) => other !== language) : [...chosen, language];
  if (next.length === 0 || shopLanguages.every((other) => next.includes(other))) return showInEveryLanguage(set, url);
  // In the shop's order, so the tab's badge always reads the same way.
  return { ...set, pictureLanguages: { ...set.pictureLanguages, [url]: shopLanguages.filter((other) => next.includes(other)) } };
}

/** The photo the AI changes for a tab: the upload behind it, or the made picture itself. */
export function photoBehind(set: PicturePairs, shown: string): string {
  const pair = pictureCounterpart(set, shown);
  return pair?.isAi ? pair.other : shown;
}
