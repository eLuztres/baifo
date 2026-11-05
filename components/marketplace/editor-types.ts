import type { Locale } from '@/lib/i18n-core';

/** A shop language, with its short label for the tabs (ES, EN, IT). */
export interface EditorLanguage {
  id: Locale;
  label: string;
}

/** A Mercadillo the listing can join, its name in the admin's language. */
export interface MercadilloOption {
  id: string;
  name: string;
}

/** A hashtag the editor can suggest, with how many listings use it. */
export interface HashtagOption {
  name: string;
  count: number;
}

/** A store category the listing can go in, its name in the admin's language. */
export interface CategoryOption {
  slug: string;
  name: string;
}
