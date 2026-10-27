import { prisma } from '@/db/prisma';
import { LISTING_TYPE_KEYS, type ListingType } from '@/lib/constants';
import { getTranslator, LOCALES } from '@/lib/i18n';

/** Lowercase without accents, so "sofa" finds "Sofá" and "bebe" finds "bebé". */
export const normalizeForSearch = (text: string) =>
  text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

/** Every word of the query appears somewhere in the text. */
export function matchesSearch(text: string, query: string) {
  const haystack = normalizeForSearch(text);
  return normalizeForSearch(query)
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => haystack.includes(word));
}

// Every string in a translations or localized-name object, in all languages.
const allStrings = (value: unknown): string[] =>
  typeof value === 'string' ? [value] : value && typeof value === 'object' ? Object.values(value).flatMap(allStrings) : [];

// "servicio" or "busco" finds every listing of that type, in any language.
const typeNames = (type: ListingType) => LOCALES.map(({ id }) => getTranslator(id)(LISTING_TYPE_KEYS[type]));

/** The listings among `ids` whose name, description, category or type match the query, in any language. */
export async function findMatchingListingIds(ids: string[], query: string) {
  const products = await prisma.product.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, description: true, translations: true, type: true, categories: { select: { name: true } } },
  });
  const matching = products.filter((product) =>
    matchesSearch(
      [product.name, product.description, ...allStrings(product.translations), ...product.categories.flatMap((category) => allStrings(category.name)), ...typeNames(product.type)].join(' '),
      query
    )
  );
  return new Set(matching.map((product) => product.id));
}
