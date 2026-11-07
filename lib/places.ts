import { cache } from 'react';
import { prisma } from '@/db/prisma';
import { localize } from '@/lib/localize';
import type { Locale } from '@/lib/i18n-core';
import { chosenPlaces, type ShopPlace } from '@/lib/places-core';

/** Every place on the island, live or not, in the admin's order (once per request). */
export const getPlaces = cache(() => prisma.place.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] }));

/** The places in the visitor's language, for the picker and the listing pages. */
export async function getShopPlaces(locale: Locale): Promise<ShopPlace[]> {
  return (await getPlaces()).map(({ id, slug, name, x, y, isLive }) => ({
    id,
    slug,
    name: localize(name, locale),
    x,
    y,
    isLive,
  }));
}

/** The ids of the places the visitor sees, or undefined when the shop has no places (nothing is filtered). */
export async function getVisitorPlaceIds(): Promise<string[] | undefined> {
  const places = await getPlaces();
  if (places.length === 0) return undefined;
  // No town picker any more (#535): an old saved choice no longer hides listings.
  return chosenPlaces(places, []).map((place) => place.id);
}

/** Where a new listing goes while there's no other information: the first live place. */
export async function getDefaultPlaceId() {
  return (await getPlaces()).find((place) => place.isLive)?.id ?? null;
}
