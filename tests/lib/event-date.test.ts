import { formatEventDate, fromShopDateTime, isEventOver, isShopToday, startOfShopDay, toShopDateTime } from '@/lib/event-date';

const ZONE = 'Atlantic/Canary';

describe('event dates on the island', () => {
  it('reads the shop clock in winter and summer time', () => {
    expect(fromShopDateTime('2026-11-29T19:00', ZONE)?.toISOString()).toBe('2026-11-29T19:00:00.000Z');
    expect(fromShopDateTime('2026-07-10T19:00', ZONE)?.toISOString()).toBe('2026-07-10T18:00:00.000Z');
    expect(toShopDateTime(new Date('2026-07-10T18:00:00Z'), ZONE)).toBe('2026-07-10T19:00');
  });

  it('rejects anything that is not a date and time', () => {
    expect(fromShopDateTime('', ZONE)).toBeNull();
    expect(fromShopDateTime('mañana', ZONE)).toBeNull();
    expect(fromShopDateTime('2026-13-45T19:00', ZONE)).toBeNull();
  });

  it('shows the weekday and day/month, or "today"', () => {
    const now = new Date('2026-11-26T10:00:00Z');
    expect(formatEventDate(new Date('2026-11-26T19:00:00Z'), 'es', 'Hoy', now, ZONE)).toBe('Hoy · 19:00');
    expect(formatEventDate(new Date('2026-11-26T19:00:00Z'), 'es', 'Hoy', new Date('2026-11-25T10:00:00Z'), ZONE)).toBe('Jueves 26/11 · 19:00');
    expect(formatEventDate(new Date('2026-11-26T19:00:00Z'), 'en', 'Today', new Date('2026-11-25T10:00:00Z'), ZONE)).toBe('Thursday 26/11 · 19:00');
    expect(formatEventDate(new Date('2026-11-26T19:00:00Z'), 'es', 'Hoy', new Date('2026-11-25T10:00:00Z'), ZONE, 'short')).toBe('Jue 26/11 · 19:00');
  });

  it('keeps an event for its whole day and ends it the day after', () => {
    const startsAt = new Date('2026-11-26T09:00:00Z');
    expect(isEventOver(startsAt, new Date('2026-11-26T23:30:00Z'), ZONE)).toBe(false);
    expect(isEventOver(startsAt, new Date('2026-11-27T00:30:00Z'), ZONE)).toBe(true);
    expect(isShopToday(startsAt, new Date('2026-11-26T23:30:00Z'), ZONE)).toBe(true);
  });

  it('starts the island day at local midnight', () => {
    expect(startOfShopDay(new Date('2026-07-10T12:00:00Z'), ZONE).toISOString()).toBe('2026-07-09T23:00:00.000Z');
  });
});
