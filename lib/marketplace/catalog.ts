import { prisma } from '@/db/prisma';
import { localize, type ProductTranslations } from '@/lib/category';
import type { Locale } from '@/lib/i18n-core';

// The showroom only shows products in a store category, so an unsure or unknown one goes here.
export const FALLBACK_CATEGORY_SLUG = 'otros';

/** A listing's title, description and short title in the shop's other languages: { en: { title, description, short } }. */
export type ListingTranslations = Partial<Record<Locale, { title: string; description: string; short?: string }>>;

/** Every category a listing can go in, whatever its type, with what the AI needs to sort it into one. */
export const getListingCategories = () =>
  prisma.category.findMany({
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    select: { id: true, slug: true, name: true, keywords: true, parentId: true, parent: { select: { name: true } } },
  });

export type ListingCategory = Awaited<ReturnType<typeof getListingCategories>>[number];

/** What a product is linked to: its category, and for a subcategory also its parent, so the ring shows it. */
export const categoryRefs = (category: { id: string; parentId: string | null }) => [
  { id: category.id },
  ...(category.parentId ? [{ id: category.parentId }] : []),
];

/** The category a slug or a name in any language stands for (older listings kept the Spanish name). */
export function findCategory<T extends { slug: string; name: unknown }>(categories: T[], value?: string | null) {
  const wanted = value?.trim().toLowerCase();
  if (!wanted) return undefined;
  return categories.find(
    (category) =>
      category.slug === wanted ||
      Object.values((category.name ?? {}) as Record<string, string>).some((name) => name?.toLowerCase() === wanted)
  );
}

/** The category's name in a language, for the product's own category text and the admin's messages. */
export const categoryName = (category: { name: unknown } | undefined, locale: Locale) => (category ? localize(category.name, locale) : '');

/** A listing's translations as the product keeps them ({ en: { name, description, shortName } }). */
export const toProductTranslations = (translations: unknown): ProductTranslations =>
  Object.fromEntries(
    Object.entries((translations ?? {}) as ListingTranslations).map(([locale, text]) => [locale, { name: text?.title, description: text?.description, shortName: text?.short }])
  );
