import { prisma } from '@/db/prisma';

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

/** The listings among `ids` whose name, description or category match the query, in any language. */
export async function findMatchingListingIds(ids: string[], query: string) {
  const products = await prisma.product.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, description: true, translations: true, categories: { select: { name: true } } },
  });
  const matching = products.filter((product) =>
    matchesSearch(
      [product.name, product.description, ...allStrings(product.translations), ...product.categories.flatMap((category) => allStrings(category.name))].join(' '),
      query
    )
  );
  return new Set(matching.map((product) => product.id));
}
