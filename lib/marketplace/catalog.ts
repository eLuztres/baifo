import type { ProductTranslations } from '@/lib/localize';
import type { Locale } from '@/lib/i18n-core';

/** A listing's title, description and short title in the shop's other languages: { en: { title, description, short } }. */
export type ListingTranslations = Partial<Record<Locale, { title: string; description: string; short?: string }>>;

/** A listing's translations as the product keeps them ({ en: { name, description, shortName } }). */
export const toProductTranslations = (translations: unknown): ProductTranslations =>
  Object.fromEntries(
    Object.entries((translations ?? {}) as ListingTranslations).map(([locale, text]) => [locale, { name: text?.title, description: text?.description, shortName: text?.short }])
  );
