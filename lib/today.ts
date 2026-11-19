import type { ListingType } from '@prisma/client';
import { isShopToday } from '@/lib/event-date';
import type { Mercadillo } from '@/lib/mercadillos';

/** Hoy is built in, not a selección made in the admin: these stand for it where a selección's id and slug go. */
export const TODAY_ID = 'today';
export const TODAY_SLUG = 'hoy';

const TODAY_MS = 24 * 60 * 60 * 1000;

interface TodayCandidate {
  createdAt: Date;
  type: ListingType;
  startsAt?: Date | null;
}

const isEventToday = (listing: TodayCandidate, now: Date) => listing.type === 'EVENT' && Boolean(listing.startsAt) && isShopToday(listing.startsAt!, now);
const isNew = (listing: TodayCandidate, now: Date) => now.getTime() - new Date(listing.createdAt).getTime() < TODAY_MS;

/** In Hoy: an event taking place today on the island, and any listing that went live in the last 24 hours. */
export const isInToday = (listing: TodayCandidate, now = new Date()) => isEventToday(listing, now) || isNew(listing, now);

/** Hoy's listings in its order: today's events by start time (the ones already started last), then the new ones, newest first. */
export function todayListings<T extends TodayCandidate>(listings: T[], now = new Date()): T[] {
  const startOf = (listing: T) => new Date(listing.startsAt!).getTime();
  const hasStarted = (listing: T) => startOf(listing) < now.getTime();
  const events = listings.filter((listing) => isEventToday(listing, now)).sort((a, b) => Number(hasStarted(a)) - Number(hasStarted(b)) || startOf(a) - startOf(b));
  const fresh = listings
    .filter((listing) => !isEventToday(listing, now) && isNew(listing, now))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return [...events, ...fresh];
}

/** Hoy as a selección, so rows, its page and the start page's list treat it like any other; its words come from the texts. */
export const todaySelection = (name: string, text: string, count: number, locale: string): Mercadillo => ({
  id: TODAY_ID,
  slug: TODAY_SLUG,
  name: { [locale]: name },
  text: { [locale]: text },
  image: null,
  icon: null,
  contactPhone: null,
  sortOrder: 0,
  createdAt: new Date(),
  tagIds: [],
  isApart: false,
  _count: { products: count },
});
