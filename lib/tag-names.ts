// How an etiqueta's names are written and compared, the same in the editor, the actions and the admin page.
import type { LocalizedText } from '@/lib/localize';
import type { Locale } from '@/lib/i18n-core';
import { foldText } from '@/lib/search-text';

export const MAX_TAG_LENGTH = 40;

/** An etiqueta's name in each language it has; a missing one isn't translated yet. */
export type TagNames = LocalizedText;

/** "  segunda   mano " becomes "segunda mano". Empty when nothing is left. */
export const cleanTagName = (text: string) => text.normalize('NFC').replace(/\s+/g, ' ').trim().slice(0, MAX_TAG_LENGTH);

/** What makes two names the same: "Música" and "musica" are one. */
export const tagNameKey = (name: string) => foldText(cleanTagName(name));

/** Its name in this language, else the first it has (shown as not translated yet). */
export const tagNameIn = (names: TagNames, locale: Locale) => names[locale] || Object.values(names).find(Boolean) || '';

/** A to Z by their name in this language. */
export const byTagName = (locale: Locale) => (a: { names: TagNames }, b: { names: TagNames }) =>
  tagNameIn(a.names, locale).localeCompare(tagNameIn(b.names, locale), locale);

/** Both names lists in one; a language already set keeps its name. */
export const withMissingNames = (names: TagNames, more: TagNames): TagNames => {
  const merged = { ...names };
  for (const [locale, name] of Object.entries(more) as [Locale, string | undefined][]) {
    const clean = cleanTagName(name ?? '');
    if (clean && !merged[locale]) merged[locale] = clean;
  }
  return merged;
};

/** An etiqueta's name as it reads in a link: "Hogar, objetos y jardín" becomes "hogar-objetos-y-jardin". */
export const tagSlug = (name: string) =>
  foldText(cleanTagName(name))
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-|-$/g, '');

/** The list of one etiqueta's listings, by its name in the visitor's language, so the link can be shared and read. */
export const tagHref = (names: TagNames, locale: Locale) => `/explore?${new URLSearchParams({ etiqueta: tagSlug(tagNameIn(names, locale)) })}`;

/** The etiqueta a link names: by its name in any language (a link shared from another language works too), or by
    its id (older links). */
export function findTagByParam<T extends { id: string; names: TagNames }>(tags: T[], param?: string): T | undefined {
  if (!param) return undefined;
  const slug = tagSlug(param);
  return tags.find((tag) => tag.id === param) ?? tags.find((tag) => Object.values(tag.names).some((name) => name && tagSlug(name) === slug));
}
