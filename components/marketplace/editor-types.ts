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
  /** "Solo aquí": its listings show only in it, never end and may have no person to reach. */
  isApart?: boolean;
  /** A "Solo aquí" selección's next day without a listing (YYYY-MM-DD), for "Online desde". */
  nextFreeDay?: string;
  /** Its etiquetas: a listing with one is in it too. */
  tagIds?: string[];
}

/** A señalador who can have sent the person, by name. */
export interface ScoutOption {
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


/** A partner editing its own listing in its panel: a new listing's contact starts from its mercadillo's. */
export interface PartnerEditor {
  name: string;
  /** Its WhatsApp, digits with the country code; empty: none. */
  contactPhone: string | null;
}
