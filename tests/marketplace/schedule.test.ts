import { isScheduled, nextFreeDay, publishAtOf } from '@/lib/marketplace/schedule';

// 20 November 2026, 10:00 on the island (winter: UTC+0).
const NOW = new Date('2026-11-20T10:00:00Z');

describe('"Online desde"', () => {
  it('waits only for a day still ahead, from midnight on the island', () => {
    expect(publishAtOf('2026-11-21', NOW)).toEqual(new Date('2026-11-21T00:00:00Z'));
    // Summer time: midnight is 23:00 UTC the day before.
    expect(publishAtOf('2027-07-01', NOW)).toEqual(new Date('2027-06-30T23:00:00Z'));
  });

  it('puts today, a past day or no day online at once', () => {
    expect(publishAtOf('2026-11-20', NOW)).toBeNull();
    expect(publishAtOf('2026-11-01', NOW)).toBeNull();
    expect(publishAtOf('', NOW)).toBeNull();
    expect(publishAtOf(undefined, NOW)).toBeNull();
  });

  it('tells a listing still waiting from one whose day has come', () => {
    expect(isScheduled({ publishAt: new Date('2026-11-21T00:00:00Z') }, NOW)).toBe(true);
    expect(isScheduled({ publishAt: '2026-11-20T00:00:00.000Z' }, NOW)).toBe(false);
    expect(isScheduled({ publishAt: null }, NOW)).toBe(false);
  });
});

describe('nextFreeDay', () => {
  it("goes the day after the last one taken, online or waiting, so a month's phrases fill a month", () => {
    expect(nextFreeDay([new Date('2026-11-20T00:05:00Z'), new Date('2026-11-24T00:00:00Z')], NOW)).toBe('2026-11-25');
  });

  it('starts today when the last one is in the past, or there is none', () => {
    expect(nextFreeDay([new Date('2026-11-12T00:05:00Z')], NOW)).toBe('2026-11-20');
    expect(nextFreeDay([], NOW)).toBe('2026-11-20');
  });

  it('counts days on the island across the change to summer time', () => {
    // 28 March 2027 is only 23 hours long; midnight of the 29th is 23:00 UTC on the 28th.
    expect(nextFreeDay([new Date('2027-03-28T00:00:00Z')], NOW)).toBe('2027-03-29');
    expect(nextFreeDay([new Date('2027-03-28T23:00:00Z')], NOW)).toBe('2027-03-30');
  });
});
