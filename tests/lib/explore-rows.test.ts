import { followingCategories, MIN_FULL_LISTINGS, moreListingsFor, splitThinRows } from '@/lib/explore-rows';

const listings = (...ids: string[]) => ids.map((id) => ({ id }));
const row = (key: string, ...ids: string[]) => ({ key, title: key, href: `/explore?c=${key}`, listings: listings(...ids) });

describe('splitThinRows', () => {
  it('keeps full rows and gathers the thin ones in one mixed row, each listing once', () => {
    const { fullRows, mixedListings } = splitThinRows([row('ending', 'a'), row('art', 'a', 'b'), row('home', 'c', 'd', 'e', 'f')]);
    expect(fullRows.map((r) => r.key)).toEqual(['home']);
    expect(mixedListings).toEqual(listings('a', 'b'));
  });

  it('changes nothing when every row is full', () => {
    const rows = [row('art', 'a', 'b', 'c', 'd'), row('home', 'e', 'f', 'g', 'h', 'i')];
    expect(splitThinRows(rows)).toEqual({ fullRows: rows, mixedListings: [] });
  });

  it('counts a row of exactly MIN_FULL_LISTINGS as full', () => {
    const ids = Array.from({ length: MIN_FULL_LISTINGS }, (_, index) => `l${index}`);
    expect(splitThinRows([row('art', ...ids)]).mixedListings).toEqual([]);
  });
});

describe('moreListingsFor', () => {
  const all = listings('a', 'b', 'c', 'd', 'e');

  it('fills a thin choice with other listings, not its own', () => {
    expect(moreListingsFor(listings('b'), all, 3)).toEqual(listings('a', 'c', 'd'));
  });

  it('fills an empty choice with the first listings, up to max', () => {
    expect(moreListingsFor([], all, 2)).toEqual(listings('a', 'b'));
  });

  it('adds nothing to a full choice', () => {
    expect(moreListingsFor(listings('a', 'b', 'c', 'd'), all, 12)).toEqual([]);
  });
});

describe('followingCategories', () => {
  const categories = [{ id: 'art' }, { id: 'home' }, { id: 'sport' }, { id: 'music' }];
  const byCategory: Record<string, { id: string }[]> = {
    art: listings('a1', 'a2'),
    home: listings('h1', 'a1'),
    sport: [],
    music: listings('m1'),
  };
  const listingsOf = (category: { id: string }) => byCategory[category.id];

  it('goes on after the chosen one, around to the one before it, each listing once and no empty ones', () => {
    const rows = followingCategories(categories, 'home', listingsOf, byCategory.home);
    expect(rows).toEqual([
      { category: { id: 'music' }, listings: listings('m1') },
      { category: { id: 'art' }, listings: listings('a2') },
    ]);
  });

  it('starts at the first one after the last', () => {
    expect(followingCategories(categories, 'music', listingsOf, byCategory.music).map(({ category }) => category.id)).toEqual(['art', 'home']);
  });
});
