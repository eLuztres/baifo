import { chosenTypeFilters, currentExploreLink, inScopeOf, listParam, ofTypes } from '@/lib/explore-filters';
import type { ListingType } from '@/lib/constants';

const listing = (id: string, type: ListingType, mercadilloIds: string[] = [], tagIds: string[] = []) => ({
  id,
  type,
  mercadilloIds,
  tags: tagIds.map((tagId) => ({ id: tagId })),
});

const LISTINGS = [
  listing('bike', 'PRODUCT', [], ['sport']),
  listing('surf-lessons', 'SERVICE', ['magma', 'surf'], ['sport', 'lessons']),
  listing('wanted-board', 'WANTED', ['magma'], ['sport']),
  listing('concert', 'EVENT', [], ['music']),
  listing('lamp', 'PRODUCT', ['magma']),
];
const ids = (items: { id: string }[]) => items.map((item) => item.id);

describe('listParam', () => {
  it('splits a comma list and drops empty parts', () => {
    expect(listParam('busco,eventos,')).toEqual(['busco', 'eventos']);
    expect(listParam(undefined)).toEqual([]);
  });
});

describe('type filters', () => {
  it('treats services as offers', () => {
    expect(chosenTypeFilters('ofrezco').flatMap((filter) => filter.types)).toEqual(['PRODUCT', 'SERVICE']);
  });

  it('keeps older type words working', () => {
    expect(chosenTypeFilters('productos')[0].params[0]).toBe('ofrezco');
    expect(chosenTypeFilters('servicios')[0].params[0]).toBe('ofrezco');
  });

  it('ignores unknown words', () => {
    expect(chosenTypeFilters('coches')).toEqual([]);
    expect(chosenTypeFilters(undefined)).toEqual([]);
  });

  it('shows every listing when no kind is chosen, else only those kinds', () => {
    expect(ofTypes(LISTINGS, [])).toBe(LISTINGS);
    expect(ids(ofTypes(LISTINGS, ['WANTED', 'EVENT']))).toEqual(['wanted-board', 'concert']);
  });
});

describe('older links', () => {
  it('sends the former Eventos category to the events', () => {
    expect(currentExploreLink({ c: 'eventos' })).toBe('/explore?tipo=eventos');
  });

  it('searches a former category by its name, which its etiqueta carries', () => {
    expect(currentExploreLink({ categoria: 'hogar' })).toBe('/explore?q=hogar');
    expect(currentExploreLink({ categoria: 'hogar,deporte' })).toBe('/explore?q=hogar');
    expect(currentExploreLink({ c: 'bienestar' })).toBe('/explore?q=bienestar');
  });

  it('leaves a current link alone', () => {
    expect(currentExploreLink({})).toBeUndefined();
    expect(currentExploreLink({ categoria: '' })).toBeUndefined();
  });
});

describe('inScopeOf', () => {
  it('keeps everything when nothing is chosen', () => {
    expect(inScopeOf(LISTINGS, {})).toEqual(LISTINGS);
  });

  it('shows exactly the listings with the chosen etiqueta', () => {
    expect(ids(inScopeOf(LISTINGS, { tagId: 'sport' }))).toEqual(['bike', 'surf-lessons', 'wanted-board']);
    expect(ids(inScopeOf(LISTINGS, { tagId: 'nobody' }))).toEqual([]);
  });

  it('shows one Mercadillo, and both filters together', () => {
    expect(ids(inScopeOf(LISTINGS, { mercadilloId: 'magma' }))).toEqual(['surf-lessons', 'wanted-board', 'lamp']);
    expect(ids(inScopeOf(LISTINGS, { mercadilloId: 'magma', tagId: 'lessons' }))).toEqual(['surf-lessons']);
  });

  it('shows a listing in every Mercadillo it is in', () => {
    expect(ids(inScopeOf(LISTINGS, { mercadilloId: 'surf' }))).toEqual(['surf-lessons']);
  });
});
