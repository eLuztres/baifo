import { eventDates, formatEventRepeat, nextEventStart, repeatColumns, repeatOf, toggleEventDay, usualDaysUntil, type EventRepeat } from '@/lib/event-repeat';
import { fromShopDateTime, toShopDateTime } from '@/lib/event-date';

const weekly = (overrides: Partial<EventRepeat> = {}): EventRepeat => ({
  frequency: 'weekly',
  start: '2026-11-19T19:00',
  weekdays: [3],
  monthlyBy: 'weekday',
  until: null,
  changes: {},
  ...overrides,
});
const startsOf = (rule: EventRepeat, fromDay: string, count: number) => eventDates(rule, fromDay, count).map((date) => date.startsAt);

describe('eventDates', () => {
  it('repeats every Thursday from the first date on', () => {
    expect(startsOf(weekly(), '2026-11-01', 3)).toEqual(['2026-11-19T19:00', '2026-11-26T19:00', '2026-12-03T19:00']);
  });

  it('takes several weekdays, never before the first date', () => {
    expect(startsOf(weekly({ weekdays: [1, 3] }), '2026-11-01', 3)).toEqual(['2026-11-19T19:00', '2026-11-24T19:00', '2026-11-26T19:00']);
  });

  it('every other week skips a week', () => {
    expect(startsOf(weekly({ frequency: 'biweekly' }), '2026-11-01', 3)).toEqual(['2026-11-19T19:00', '2026-12-03T19:00', '2026-12-17T19:00']);
  });

  it('monthly on the same weekday: the third Thursday', () => {
    expect(startsOf(weekly({ frequency: 'monthly' }), '2026-11-01', 3)).toEqual(['2026-11-19T19:00', '2026-12-17T19:00', '2027-01-21T19:00']);
  });

  it('monthly on day 31 falls on the last day of shorter months', () => {
    expect(startsOf(weekly({ frequency: 'monthly', monthlyBy: 'day', start: '2027-01-31T10:00' }), '2027-01-01', 3)).toEqual([
      '2027-01-31T10:00',
      '2027-02-28T10:00',
      '2027-03-31T10:00',
    ]);
  });

  it('a fifth weekday only in the months that have one', () => {
    // 29 October 2026 is the fifth Thursday; November has none, December does (31).
    expect(startsOf(weekly({ frequency: 'monthly', start: '2026-10-29T19:00' }), '2026-10-01', 2)).toEqual(['2026-10-29T19:00', '2026-12-31T19:00']);
  });

  it('always counts the first date, even on a weekday not chosen', () => {
    expect(startsOf(weekly({ weekdays: [0] }), '2026-11-01', 3)).toEqual(['2026-11-19T19:00', '2026-11-23T19:00', '2026-11-30T19:00']);
  });

  it('a date moved later never hides the dates before it', () => {
    expect(startsOf(weekly({ changes: { '2026-11-19': '2026-12-05T19:00' } }), '2026-11-01', 3)).toEqual(['2026-11-26T19:00', '2026-12-03T19:00', '2026-12-05T19:00']);
  });

  it('stops at its last day', () => {
    expect(startsOf(weekly({ until: '2026-12-03' }), '2026-11-01', 10)).toHaveLength(3);
  });

  it('keeps cancelled and moved dates in place, marked', () => {
    const dates = eventDates(weekly({ changes: { '2026-11-26': null, '2026-12-03': '2026-12-03T20:30' } }), '2026-11-01', 3);
    expect(dates.map(({ startsAt, isCancelled, isMoved }) => [startsAt, isCancelled, isMoved])).toEqual([
      ['2026-11-19T19:00', false, false],
      ['2026-11-26T19:00', true, false],
      ['2026-12-03T20:30', false, true],
    ]);
  });
});

describe('dates added on the calendar', () => {
  it('a weekly event gets a date on top, in order', () => {
    expect(startsOf(weekly({ changes: { '+2026-11-21': '2026-11-21T19:00' } }), '2026-11-01', 3)).toEqual(['2026-11-19T19:00', '2026-11-21T19:00', '2026-11-26T19:00']);
  });

  it('picked dates only: the first date and the ones added', () => {
    const rule = weekly({ frequency: 'custom', changes: { '+2026-12-24': '2026-12-24T19:00', '+2026-12-05': '2026-12-05T19:00' } });
    expect(startsOf(rule, '2026-11-01', 10)).toEqual(['2026-11-19T19:00', '2026-12-05T19:00', '2026-12-24T19:00']);
    expect([...usualDaysUntil(rule, '2027-12-31')]).toEqual(['2026-11-19']);
  });

  it('an added date after the last day does not count', () => {
    expect(startsOf(weekly({ until: '2026-11-26', changes: { '+2026-12-24': '2026-12-24T19:00' } }), '2026-11-01', 10)).toEqual(['2026-11-19T19:00', '2026-11-26T19:00']);
  });
});

describe('toggleEventDay', () => {
  it('a usual date is cancelled, and back on a second tap', () => {
    const cancelled = toggleEventDay(weekly(), '2026-11-26');
    expect(cancelled).toEqual({ '2026-11-26': null });
    expect(toggleEventDay(weekly({ changes: cancelled }), '2026-11-26')).toEqual({});
  });

  it('any other day is added at the usual time, and taken away again', () => {
    const added = toggleEventDay(weekly(), '2026-11-28');
    expect(added).toEqual({ '+2026-11-28': '2026-11-28T19:00' });
    expect(toggleEventDay(weekly({ changes: added }), '2026-11-28')).toEqual({});
  });

  it('an added date that became a usual day counts once, and a tap cancels both', () => {
    const rule = weekly({ changes: { '+2026-11-26': '2026-11-26T19:00' } });
    expect(startsOf(rule, '2026-11-01', 3)).toEqual(['2026-11-19T19:00', '2026-11-26T19:00', '2026-12-03T19:00']);
    expect(toggleEventDay(rule, '2026-11-26')).toEqual({ '2026-11-26': null });
  });

  it('added dates follow the usual time', () => {
    expect(startsOf(weekly({ frequency: 'custom', start: '2026-11-19T20:00', changes: { '+2026-12-05': '2026-12-05T19:00' } }), '2026-11-01', 3)).toEqual([
      '2026-11-19T20:00',
      '2026-12-05T20:00',
    ]);
  });

  it('a week off in a biweekly event is a day to add', () => {
    expect(toggleEventDay(weekly({ frequency: 'biweekly' }), '2026-11-26')).toEqual({ '+2026-11-26': '2026-11-26T19:00' });
  });
});

describe('nextEventStart', () => {
  const at = (value: string) => fromShopDateTime(value)!;

  it('is today all day, then the next week', () => {
    expect(toShopDateTime(nextEventStart(weekly(), at('2026-11-19T23:00'))!)).toBe('2026-11-19T19:00');
    expect(toShopDateTime(nextEventStart(weekly(), at('2026-11-20T00:10'))!)).toBe('2026-11-26T19:00');
  });

  it('skips a cancelled date', () => {
    expect(toShopDateTime(nextEventStart(weekly({ changes: { '2026-11-26': null } }), at('2026-11-20T09:00'))!)).toBe('2026-12-03T19:00');
  });

  it('keeps the usual time in summer and winter', () => {
    const summer = nextEventStart(weekly({ start: '2027-03-25T19:00' }), at('2027-03-29T09:00'))!;
    expect(toShopDateTime(summer)).toBe('2027-04-01T19:00');
  });

  it('is none after the last date', () => {
    expect(nextEventStart(weekly({ until: '2026-11-26' }), at('2026-11-27T09:00'))).toBeNull();
  });
});

describe('repeatColumns and repeatOf', () => {
  it('save and read back the same rule', () => {
    const start = fromShopDateTime('2026-11-19T19:00')!;
    const columns = repeatColumns(start, { frequency: 'weekly', weekdays: [], monthlyBy: 'weekday', until: '2027-01-28', changes: { '2026-11-26': null } });
    expect(columns.repeatWeekdays).toEqual([3]);
    expect(repeatOf(columns)).toEqual(weekly({ until: '2027-01-28', changes: { '2026-11-26': null } }));
  });

  it('a one-off event has no rule', () => {
    expect(repeatOf(repeatColumns(new Date(), null))).toBeNull();
  });
});

describe('formatEventRepeat', () => {
  const t = (key: string, values?: Record<string, string | number>) => `${key} ${JSON.stringify(values ?? {})}`;

  it('names the weekdays in the visitor language', () => {
    expect(formatEventRepeat(weekly({ weekdays: [1, 3] }), 'es', t as never)).toBe('EVENT_REPEAT_WEEKLY {"days":"martes y jueves","time":"19:00"}');
  });

  it('picked dates say so', () => {
    expect(formatEventRepeat(weekly({ frequency: 'custom' }), 'es', t as never)).toBe('EVENT_REPEAT_CUSTOM {"time":"19:00"}');
  });

  it('says which weekday of the month', () => {
    expect(formatEventRepeat(weekly({ frequency: 'monthly' }), 'es', t as never)).toContain('"nth":"EVENT_NTH_2 {}","weekday":"jueves"');
  });
});
