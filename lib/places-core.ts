/** The visitor's chosen places: kept in localStorage, mirrored into a cookie so the server can filter the first render. */
export const PLACES_STORAGE_KEY = 'shop-places';
export const PLACES_COOKIE = 'places';
// A year: the choice is a preference, like the language.
export const PLACES_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** A place as the shop shows it: its pin on the island and whether it's open yet. */
export interface ShopPlace {
  id: string;
  slug: string;
  name: string;
  x: number;
  y: number;
  isLive: boolean;
  /** Its Corral's name, when the place has its meeting spot. */
  corralName?: string;
}

/** The saved slugs as written in the cookie or storage ("corralejo,el-cotillo"). */
export const parsePlaceSlugs = (value?: string | null) =>
  (value ?? '')
    .split(',')
    .map((slug) => slug.trim())
    .filter(Boolean);

/** The live places the visitor chose; nothing saved, or nothing of it still live, means all live places. */
export function chosenPlaces<T extends Pick<ShopPlace, 'slug' | 'isLive'>>(places: T[], saved: string[]) {
  const live = places.filter((place) => place.isLive);
  const chosen = live.filter((place) => saved.includes(place.slug));
  return chosen.length > 0 ? chosen : live;
}
