import { cache } from 'react';
import { cookies } from 'next/headers';
import { prisma } from '@/db/prisma';
import { localize } from '@/lib/category';
import type { Locale } from '@/lib/i18n-core';
import { chosenPlaces, parsePlaceSlugs, PLACES_COOKIE, type ShopPlace } from '@/lib/places-core';

/** Every place on the island, live or not, in the admin's order, with its Corral if it has one (once per request). */
export const getPlaces = cache(() =>
  prisma.place.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }], include: { corral: true } })
);

/** The places in the visitor's language, for the picker and the listing pages. */
export async function getShopPlaces(locale: Locale): Promise<ShopPlace[]> {
  return (await getPlaces()).map(({ id, slug, name, x, y, isLive, corral }) => ({
    id,
    slug,
    name: localize(name, locale),
    x,
    y,
    isLive,
    corralName: corral?.name,
  }));
}

/** The ids of the places the visitor sees, or undefined when the shop has no places (nothing is filtered). */
export async function getVisitorPlaceIds(): Promise<string[] | undefined> {
  const places = await getPlaces();
  if (places.length === 0) return undefined;
  const saved = parsePlaceSlugs((await cookies()).get(PLACES_COOKIE)?.value);
  return chosenPlaces(places, saved).map((place) => place.id);
}

/** Where a new listing goes while there's no other information: the first live place. */
export async function getDefaultPlaceId() {
  return (await getPlaces()).find((place) => place.isLive)?.id ?? null;
}

/** A place with its Corral, texts in the visitor's language; undefined for an unknown place. */
export async function getPlaceWithCorral(slug: string, locale: Locale) {
  const place = (await getPlaces()).find((item) => item.slug === slug);
  if (!place) return undefined;
  const { corral } = place;
  return {
    id: place.id,
    slug: place.slug,
    name: localize(place.name, locale),
    isLive: place.isLive,
    corral: corral && { ...corral, text: localize(corral.text, locale), hours: localize(corral.hours, locale) },
  };
}

export type PlaceWithCorral = NonNullable<Awaited<ReturnType<typeof getPlaceWithCorral>>>;
