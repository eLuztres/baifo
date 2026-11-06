import type { Locale } from '@/lib/i18n-core';
import type { TagNames } from '@/lib/tag-names';

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

/** An etiqueta on the listing: a new one has no id yet and is made on save. */
export interface EditorTag {
  id?: string;
  names: TagNames;
}

/** An etiqueta the editor offers, with how many listings use it. */
export interface TagOption extends EditorTag {
  id: string;
  count: number;
}

/** A store category the listing can go in, its name in the admin's language. */
export interface CategoryOption {
  slug: string;
  name: string;
}
