import { freshMix } from '@/lib/fresh-mix';

const NOW = new Date('2026-11-08T12:00:00Z').getTime();
const DAY = 24 * 60 * 60 * 1000;
const listings = Array.from({ length: 40 }, (_, index) => ({ id: `id-${index}`, createdAt: new Date(NOW - (index + 10) * DAY) }));
const ids = (list: { id: string }[]) => list.map((listing) => listing.id);

describe('freshMix', () => {
  it('keeps the same order for the same seed', () => {
    expect(ids(freshMix(listings, 'abc', NOW))).toEqual(ids(freshMix(listings, 'abc', NOW)));
  });

  it('gives another order for another seed, with every listing once', () => {
    const first = ids(freshMix(listings, 'abc', NOW));
    const second = ids(freshMix(listings, 'xyz', NOW));
    expect(second).not.toEqual(first);
    expect([...second].sort()).toEqual([...ids(listings)].sort());
  });

  it('is not newest first', () => {
    expect(ids(freshMix(listings, 'abc', NOW))).not.toEqual(ids(listings));
  });

  it('brings new listings nearer the top on average', () => {
    const fresh = listings.map((listing, index) => (index % 2 ? listing : { ...listing, createdAt: new Date(NOW - DAY) }));
    const seeds = Array.from({ length: 50 }, (_, index) => `seed-${index}`);
    const averageSpot = (isNew: boolean) => {
      const spots = seeds.flatMap((seed) => freshMix(fresh, seed, NOW).flatMap((listing, spot) => (NOW - listing.createdAt.getTime() < 3 * DAY) === isNew ? [spot] : []));
      return spots.reduce((sum, spot) => sum + spot, 0) / spots.length;
    };
    expect(averageSpot(true)).toBeLessThan(averageSpot(false));
  });
});
