import { localize, localizeProduct } from '@/lib/category';
import type { Locale } from '@/lib/i18n-core';
import type { StoreCategory } from '@/lib/actions/category.actions';
import type { CollectionRing } from './in-stock-rings';

/** A ring in the store's banner; it goes to the client, so its category links stay behind. */
export type MaterialRing = Omit<CollectionRing, 'categoryIds' | 'images' | 'createdAt' | 'condition' | 'translations' | 'placeId'>;

export interface MaterialGroup {
  /** The category's slug, used in links (`?c=lava`). */
  id: string;
  name: string;
  text: string;
  rings: MaterialRing[];
}

/** The rings in stock, grouped by store category in the ring's order; empty categories only when asked. */
export function groupByCategory(
  categories: StoreCategory[],
  rings: CollectionRing[],
  locale: Locale,
  shouldKeepEmpty = false
): MaterialGroup[] {
  return categories
    .map((category) => ({
      id: category.slug,
      name: localize(category.name, locale),
      text: localize(category.text, locale),
      rings: rings
        .filter((ring) => ring.categoryIds.includes(category.id))
        .map((ring) => ({ id: ring.id, slug: ring.slug, name: localizeProduct(ring, locale).name, image: ring.image, price: ring.price, priceMax: ring.priceMax, type: ring.type, isFromPrice: ring.isFromPrice, isReserved: ring.isReserved })),
    }))
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
