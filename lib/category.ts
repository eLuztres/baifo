import type { Prisma } from '@prisma/client';
import type { Locale } from '@/lib/i18n-core';

/** The rings' order in the store: the admin's order, new rings (still 0) first and newest first. */
export const RING_ORDER: Prisma.ProductOrderByWithRelationInput[] = [{ sortOrder: 'asc' }, { createdAt: 'desc' }];

/** A category text in each language the shop writes it in, e.g. { es: 'Lava y arena', en: 'Lava and sand' }. */
export type LocalizedText = Partial<Record<Locale, string>>;

/** The text in the visitor's language, else in the first language that has one. */
export function localize(value: unknown, locale: Locale, fallbackLocale?: Locale): string {
  const texts = (value ?? {}) as LocalizedText;
  return texts[locale] || (fallbackLocale && texts[fallbackLocale]) || Object.values(texts).find(Boolean) || '';
}

/** Per-language texts of a product: { en: { name, description } }. */
export type ProductTranslations = Partial<Record<Locale, { name?: string; description?: string }>>;

/** A product's name and description in the visitor's language, else its own. */
export function localizeProduct<T extends { name: string; description?: string; translations?: unknown }>(product: T, locale: Locale) {
  const text = ((product.translations ?? {}) as ProductTranslations)[locale];
  return { name: text?.name || product.name, description: text?.description || product.description || '' };
}

/** What the category editor needs; only admins get it. */
export interface EditableCategory {
  id: string;
  slug: string;
  name: LocalizedText;
  text: LocalizedText;
  image: string | null;
  keywords: string[];
  scene: string;
  sceneVariants: string[];
  /** How many rings in stock it has. */
  ringCount: number;
}

/** The admin tools of the store's category ring. */
export interface CategoryRingAdmin {
  /** The languages the shop writes category texts in, the default one first. */
  locales: Locale[];
  categories: EditableCategory[];
  /** Per category id: where its "Add a product" tile leads (newProductPathFor). */
  addProductHrefs: Record<string, string>;
}
