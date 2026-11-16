import { freshMix, isMixOld, seededRank, renewMix, MIX_HOURS, needsNewMix, newMixSeed, readMixSeed, withCookie } from '@/lib/fresh-mix';

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

describe('the mix cookie', () => {
  const HOUR = 60 * 60 * 1000;
  const fresh = `abc12345.${NOW - HOUR}`;
  const old = `abc12345.${NOW - MIX_HOURS * HOUR}`;

  it('holds the seed and when it was made', () => {
    const cookie = newMixSeed(NOW);
    expect(cookie).toMatch(new RegExp(`^[0-9a-f]{8}\\.${NOW}$`));
    expect(readMixSeed(cookie)).toHaveLength(8);
  });

  it('reads an older cookie that is only the seed, and counts it as old', () => {
    expect(readMixSeed('abc12345')).toBe('abc12345');
    expect(isMixOld('abc12345', NOW)).toBe(true);
    expect(readMixSeed()).toBe('');
  });

  it('keeps the seed and counts its age again from now when the list is looked at', () => {
    expect(renewMix(old, NOW)).toBe(`abc12345.${NOW}`);
    expect(isMixOld(renewMix(old, NOW), NOW)).toBe(false);
    expect(renewMix('abc12345', NOW)).toBe(`abc12345.${NOW}`);
  });

  it('is old after MIX_HOURS', () => {
    expect(isMixOld(fresh, NOW)).toBe(false);
    expect(isMixOld(old, NOW)).toBe(true);
  });

  it('gives a new order on a new visit to the list, never on a quiet refresh of it', () => {
    expect(needsNewMix(undefined, false, NOW)).toBe(true);
    expect(needsNewMix(old, false, NOW)).toBe(true);
    expect(needsNewMix(old, true, NOW)).toBe(false);
    expect(needsNewMix(fresh, false, NOW)).toBe(false);
  });

  it('replaces an older value in the cookie header and keeps the others', () => {
    expect(withCookie('a=1; mix=old.1; b=2', 'mix', 'new.2')).toBe('a=1; b=2; mix=new.2');
    expect(withCookie(null, 'mix', 'new.2')).toBe('mix=new.2');
  });
});

describe('seededRank', () => {
  it('gives the same number for the same seed and key, in [0, 1)', () => {
    const rank = seededRank('abc');
    expect(seededRank('abc')('row0:12')).toBe(rank('row0:12'));
    expect(rank('row0:12')).toBeGreaterThanOrEqual(0);
    expect(rank('row0:12')).toBeLessThan(1);
    expect(rank('row0:24')).not.toBe(rank('row0:12'));
    expect(seededRank('xyz')('row0:12')).not.toBe(rank('row0:12'));
  });
});
