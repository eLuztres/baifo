import type { StoreCategory } from '@/lib/actions/category.actions';
import type { CategoryRingAdmin, LocalizedText } from '@/lib/category';
import { newProductPathFor } from '@/lib/constants';
import { getEnabledLocales } from '@/lib/i18n-server';

/** What the category editors need: the shop's languages (default first) and every category with its ring count. */
export function toRingAdmin(categories: StoreCategory[], rings: { categoryIds: string[] }[]): CategoryRingAdmin {
  const defaultLocale = process.env.DEFAULT_LOCALE;
  const locales = getEnabledLocales();
  return {
    locales: [...locales].sort((a, b) => Number(b === defaultLocale) - Number(a === defaultLocale)),
    categories: categories.map((category) => ({
      ...category,
      name: category.name as LocalizedText,
      text: category.text as LocalizedText,
      ringCount: rings.filter((ring) => ring.categoryIds.includes(category.id)).length,
    })),
    addProductHrefs: Object.fromEntries(categories.map((category) => [category.id, newProductPathFor(category)])),
  };
}
