import { moreListingsFor, splitThinRows } from '@/lib/explore-rows';

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
});

describe('moreListingsFor', () => {
  const all = listings('a', 'b', 'c', 'd', 'e');

  it('fills a thin choice with other listings, not its own', () => {
    expect(moreListingsFor(listings('b'), all, 3)).toEqual(listings('a', 'c', 'd'));
  });

  it('adds nothing to a full choice', () => {
    expect(moreListingsFor(listings('a', 'b', 'c', 'd'), all, 12)).toEqual([]);
  });
});
