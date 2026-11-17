import { isInToday, todayListings } from '@/lib/today';

// 10:00 on the island (Canarias is UTC+0 in November).
const NOW = new Date('2026-11-17T10:00:00Z');
const hoursAgo = (hours: number) => new Date(NOW.getTime() - hours * 60 * 60 * 1000);
const listing = (id: string, createdAt: Date, extra: { type?: 'PRODUCT' | 'EVENT'; startsAt?: Date } = {}) => ({ id, createdAt, type: extra.type ?? 'PRODUCT', startsAt: extra.startsAt ?? null });

describe('isInToday', () => {
  it('holds listings from the last 24 hours, not older ones', () => {
    expect(isInToday(listing('a', hoursAgo(23)), NOW)).toBe(true);
    expect(isInToday(listing('b', hoursAgo(25)), NOW)).toBe(false);
  });

  it('holds an old event taking place today, not one tomorrow', () => {
    expect(isInToday(listing('a', hoursAgo(100), { type: 'EVENT', startsAt: new Date('2026-11-17T20:00:00Z') }), NOW)).toBe(true);
    expect(isInToday(listing('b', hoursAgo(100), { type: 'EVENT', startsAt: new Date('2026-11-18T20:00:00Z') }), NOW)).toBe(false);
  });

  it('holds an event uploaded today for another day', () => {
    expect(isInToday(listing('a', hoursAgo(2), { type: 'EVENT', startsAt: new Date('2026-11-21T20:00:00Z') }), NOW)).toBe(true);
  });

  it('counts the day by the island, not by 24 hours, for events', () => {
    expect(isInToday(listing('a', hoursAgo(100), { type: 'EVENT', startsAt: new Date('2026-11-16T23:30:00Z') }), NOW)).toBe(false);
  });
});

describe('todayListings', () => {
  it("puts today's events first by time, started ones last, then the new ones newest first, and leaves the rest out", () => {
    const listings = [
      listing('old', hoursAgo(30)),
      listing('new-3h', hoursAgo(3)),
      listing('jam-20h', hoursAgo(50), { type: 'EVENT', startsAt: new Date('2026-11-17T20:00:00Z') }),
      listing('yoga-7h', hoursAgo(50), { type: 'EVENT', startsAt: new Date('2026-11-17T07:30:00Z') }),
      listing('new-1h', hoursAgo(1)),
      listing('talk-12h', hoursAgo(50), { type: 'EVENT', startsAt: new Date('2026-11-17T12:00:00Z') }),
      listing('saturday', hoursAgo(9), { type: 'EVENT', startsAt: new Date('2026-11-21T20:00:00Z') }),
    ];
    expect(todayListings(listings, NOW).map((one) => one.id)).toEqual(['talk-12h', 'jam-20h', 'yoga-7h', 'new-1h', 'new-3h', 'saturday']);
  });
});
