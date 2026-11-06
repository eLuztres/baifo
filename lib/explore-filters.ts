// The explore view's filters, as its link holds them; the page and the tests share them.
import { listingTypeOf, type ListingType } from '@/lib/constants';
import type { TranslationKey } from '@/lib/i18n-core';

/** The three things a listing can be. Services count as offers; the first param is the link's, older links keep working. */
export const TYPE_FILTERS: { params: string[]; labelKey: TranslationKey; types: ListingType[] }[] = [
  { params: ['ofrezco', 'productos', 'servicios'], labelKey: 'EXPLORE_TYPE_OFFER', types: ['PRODUCT', 'SERVICE'] },
  { params: ['busco'], labelKey: 'EXPLORE_TYPE_WANTED', types: ['WANTED'] },
  { params: ['eventos'], labelKey: 'EXPLORE_TYPE_EVENT', types: ['EVENT'] },
];

/** "a,b" → ["a", "b"]; missing → []. */
export const listParam = (param?: string) => param?.split(',').filter(Boolean) ?? [];

/** The type filters a `tipo` param names; unknown words are left out. */
export const chosenTypeFilters = (tipo?: string) => TYPE_FILTERS.filter(({ params }) => listParam(tipo).some((param) => params.includes(param)));

/** Where an older link goes now: ?c=eventos was the Eventos category, and a former category is searched by its name,
    which its etiqueta carries. Nothing: the link is current. */
export function currentExploreLink({ c, categoria }: { c?: string; categoria?: string }): string | undefined {
  if (c && listingTypeOf(c)) return `/explore?tipo=${c}`;
  const oldCategory = c || listParam(categoria)[0];
  return oldCategory ? `/explore?${new URLSearchParams({ q: oldCategory })}` : undefined;
}

interface Narrowable {
  type: ListingType;
  mercadilloId: string | null;
  tags: { id: string }[];
}

/** The listings in one Mercadillo and with one etiqueta, when chosen. */
export const inScopeOf = <T extends Narrowable>(listings: T[], { mercadilloId, tagId }: { mercadilloId?: string; tagId?: string }) =>
  listings.filter((listing) => (!mercadilloId || listing.mercadilloId === mercadilloId) && (!tagId || listing.tags.some((tag) => tag.id === tagId)));

/** The listings of the chosen kinds; none chosen: all. */
export const ofTypes = <T extends Narrowable>(listings: T[], types: ListingType[]) =>
  types.length ? listings.filter((listing) => types.includes(listing.type)) : listings;
