/** A place as the shop shows it: its pin on the island and whether it's open yet. */
export interface ShopPlace {
  id: string;
  slug: string;
  name: string;
  x: number;
  y: number;
  isLive: boolean;
}

/** The live places the visitor chose; nothing saved, or nothing of it still live, means all live places. */
export function chosenPlaces<T extends Pick<ShopPlace, 'slug' | 'isLive'>>(places: T[], saved: string[]) {
  const live = places.filter((place) => place.isLive);
  const chosen = live.filter((place) => saved.includes(place.slug));
  return chosen.length > 0 ? chosen : live;
}
