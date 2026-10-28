import { localize, localizeProduct } from '@/lib/category';
import { NEW_LISTING_HOURS } from '@/lib/constants';
import type { Locale } from '@/lib/i18n-core';
import type { StoreCategory } from '@/lib/actions/category.actions';
import type { CollectionRing } from './in-stock-rings';

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
  const newSince = Date.now() - NEW_LISTING_HOURS * 60 * 60 * 1000;
  return categories
    .map((category) => {
      const inCategory = rings.filter((ring) => ring.categoryIds.includes(category.id));
      return {
        id: category.slug,
        name: localize(category.name, locale),
        text: localize(category.text, locale),
        newCount: inCategory.filter((ring) => ring.createdAt.getTime() > newSince).length,
        rings: inCategory.map((ring) => {
          const { name, shortName } = localizeProduct(ring, locale);
          return { id: ring.id, slug: ring.slug, name, shortName, image: ring.image, price: ring.price, priceMax: ring.priceMax, type: ring.type, isFromPrice: ring.isFromPrice, isReserved: ring.isReserved };
        }),
      };
    })
    .filter((group) => shouldKeepEmpty || group.rings.length > 0);
}

export interface NextRing {
  slug: string;
  categoryId: string;
}

/** The ring after `slug` in the store's order, category by category, starting over after the last one.
    A ring can be in several categories, so `categoryId` says which one the visitor is going through. */
export function findNextRing(groups: MaterialGroup[], slug: string, categoryId?: string): NextRing | undefined {
  const order = groups.flatMap((group) => group.rings.map((ring) => ({ slug: ring.slug, categoryId: group.id })));
  const inCategory = order.findIndex((ring) => ring.slug === slug && ring.categoryId === categoryId);
  const index = inCategory >= 0 ? inCategory : order.findIndex((ring) => ring.slug === slug);
  for (let step = 1; step <= order.length; step++) {
    const next = order[(index + step) % order.length];
    if (next.slug !== slug) return next;
  }
  return undefined;
}
