import { localize, localizeProduct } from '@/lib/category';
import { NEW_LISTING_HOURS } from '@/lib/constants';
import type { Locale } from '@/lib/i18n-core';
import type { StoreCategory } from '@/lib/actions/category.actions';
import type { CollectionRing, RingSummary } from './in-stock-rings';

// Only the first few of a category show under the ring, a taste; a "+12" tile leads into the feed with all of them.
export const RING_PREVIEW_COUNT = 8;

const newSince = () => Date.now() - NEW_LISTING_HOURS * 60 * 60 * 1000;

/** A ring in the store's banner; it goes to the client, so its category links stay behind. */
export type MaterialRing = Omit<CollectionRing, 'categoryIds' | 'images' | 'createdAt' | 'condition' | 'translations' | 'placeId' | 'shortName'> & {
  /** The name in a word or three, for the ring row. */
  shortName: string;
};

export interface MaterialGroup {
  /** The category's slug, used in links (`?c=lava`). */
  id: string;
  name: string;
  text: string;
  /** How many of its rings went into the shop in the last NEW_LISTING_HOURS ("3 new" on its ring card). */
  newCount: number;
  rings: MaterialRing[];
}

/** The rings in stock, grouped by store category in the ring's order; empty categories only when asked. */
export function groupByCategory(
  categories: StoreCategory[],
  rings: CollectionRing[],
  locale: Locale,
  shouldKeepEmpty = false
): MaterialGroup[] {
  const since = newSince();
  return categories
    .map((category) => {
      const inCategory = rings.filter((ring) => ring.categoryIds.includes(category.id));
      return {
        id: category.slug,
        name: localize(category.name, locale),
        text: localize(category.text, locale),
        newCount: inCategory.filter((ring) => ring.createdAt.getTime() > since).length,
        rings: inCategory.map((ring) => {
          const { name, shortName } = localizeProduct(ring, locale);
          return { id: ring.id, slug: ring.slug, name, shortName, image: ring.image, price: ring.price, priceMax: ring.priceMax, type: ring.type, isFromPrice: ring.isFromPrice, isReserved: ring.isReserved };
        }),
      };
    })
    .filter((group) => shouldKeepEmpty || group.rings.length > 0);
}

export interface CategoryCount {
  /** All its listings, not only the few loaded ("See all 40"). */
  count: number;
  newCount: number;
}

/** The home's picks from the light summaries: each category's first few and the `extraSlugs` (loaded in full), and every category's counts. */
export function pickShowroomRings(categories: Pick<StoreCategory, 'id' | 'slug'>[], summaries: RingSummary[], extraSlugs: Set<string>) {
  const since = newSince();
  const ids = new Set(summaries.filter((ring) => extraSlugs.has(ring.slug)).map((ring) => ring.id));
  const counts = new Map<string, CategoryCount>();
  for (const category of categories) {
    const inCategory = summaries.filter((ring) => ring.categoryIds.includes(category.id));
    inCategory.slice(0, RING_PREVIEW_COUNT).forEach((ring) => ids.add(ring.id));
    counts.set(category.slug, { count: inCategory.length, newCount: inCategory.filter((ring) => ring.createdAt.getTime() > since).length });
  }
  return { ids: [...ids], counts };
}

/** The store's order for the swipe to the next ring: only slugs, by category, from the light summaries. */
export const orderByCategory = (categories: Pick<StoreCategory, 'id' | 'slug'>[], summaries: RingSummary[]): RingOrderGroup[] =>
  categories
    .map((category) => ({ id: category.slug, rings: summaries.filter((ring) => ring.categoryIds.includes(category.id)) }))
    .filter((group) => group.rings.length > 0);

/** What findNextRing needs of a category: its slug and its rings' slugs in order. */
export interface RingOrderGroup {
  id: string;
  rings: { slug: string }[];
}

export interface NextRing {
  slug: string;
  categoryId: string;
}

/** The ring after `slug` in the store's order, category by category, starting over after the last one.
    A ring can be in several categories, so `categoryId` says which one the visitor is going through. */
export function findNextRing(groups: RingOrderGroup[], slug: string, categoryId?: string): NextRing | undefined {
  const order = groups.flatMap((group) => group.rings.map((ring) => ({ slug: ring.slug, categoryId: group.id })));
  const inCategory = order.findIndex((ring) => ring.slug === slug && ring.categoryId === categoryId);
  const index = inCategory >= 0 ? inCategory : order.findIndex((ring) => ring.slug === slug);
  for (let step = 1; step <= order.length; step++) {
    const next = order[(index + step) % order.length];
    if (next.slug !== slug) return next;
  }
  return undefined;
}
