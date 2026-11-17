import { formatEventDate, fromShopDateTime, toShopDateTime } from '@/lib/event-date';
import type { Translator } from '@/lib/i18n-core';

export const REPEAT_FREQUENCIES = ['weekly', 'biweekly', 'monthly'] as const;
export type RepeatFrequency = (typeof REPEAT_FREQUENCIES)[number];

/** A monthly event: on the same day number ("el día 19") or the same weekday ("el tercer jueves"). */
export const MONTHLY_BYS = ['weekday', 'day'] as const;
export type MonthlyBy = (typeof MONTHLY_BYS)[number];

/** Single dates changed by hand, by their usual day: null cancelled, "2026-12-10T20:00" moved there. */
export type EventDateChanges = Record<string, string | null>;

/** A repeating event's rule, on the island's clock. */
export interface EventRepeat {
  frequency: RepeatFrequency;
  /** The first date with the usual time: "2026-11-19T19:00". */
  start: string;
  /** 0 Monday … 6 Sunday; only for weekly and biweekly. */
  weekdays: number[];
  monthlyBy: MonthlyBy;
  /** The last day ("2027-01-28"), or none. */
  until: string | null;
  changes: EventDateChanges;
}

export interface EventDate {
  /** The usual day, which keys a change. */
  day: string;
  /** When it is, moved or not: "2026-11-26T19:00". */
  startsAt: string;
  isCancelled: boolean;
  isMoved: boolean;
}

const DAY_MS = 24 * 60 * 60 * 1000;
// Without an end and with every date cancelled, the search stops somewhere.
const MAX_DAYS_LOOKED_AT = 800;

const toDay = (date: Date) => date.toISOString().slice(0, 10);
const parseDay = (day: string) => new Date(`${day}T00:00:00Z`);
const addDays = (day: string, days: number) => toDay(new Date(parseDay(day).getTime() + days * DAY_MS));
export const weekdayOf = (day: string) => (parseDay(day).getUTCDay() + 6) % 7;
const daysInMonth = (year: number, month: number) => new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

/** Which week of its month a day is in: 0 for the first seven days ("primer"), up to 4 ("quinto"). */
export const weekOfMonth = (day: string) => Math.floor((parseDay(day).getUTCDate() - 1) / 7);

/** The rule's usual days from its first on, without end. Calendar days only, so summer and winter time can't shift them. */
function* usualDays({ frequency, start, weekdays, monthlyBy }: EventRepeat): Generator<string> {
  const firstDay = start.slice(0, 10);
  if (frequency === 'monthly') {
    const first = parseDay(firstDay);
    const [year, month, date] = [first.getUTCFullYear(), first.getUTCMonth(), first.getUTCDate()];
    for (let offset = 0; ; offset++) {
      const [y, m] = [year + Math.floor((month + offset) / 12), (month + offset) % 12];
      if (monthlyBy === 'day') {
        // "El día 31" falls on the last day of shorter months.
        yield toDay(new Date(Date.UTC(y, m, Math.min(date, daysInMonth(y, m)))));
        continue;
      }
      const firstOfMonth = toDay(new Date(Date.UTC(y, m, 1)));
      const dayNumber = ((weekdayOf(firstDay) - weekdayOf(firstOfMonth) + 7) % 7) + 1 + weekOfMonth(firstDay) * 7;
      // A fifth Thursday only in the months that have one.
      if (dayNumber <= daysInMonth(y, m)) yield toDay(new Date(Date.UTC(y, m, dayNumber)));
    }
  }
  const days = weekdays.length > 0 ? [...weekdays].sort((a, b) => a - b) : [weekdayOf(firstDay)];
  const step = frequency === 'biweekly' ? 14 : 7;
  // The first date always counts, even on a weekday not chosen.
  if (!days.includes(weekdayOf(firstDay))) yield firstDay;
  for (let monday = addDays(firstDay, -weekdayOf(firstDay)); ; monday = addDays(monday, step)) {
    for (const weekday of days) {
      const day = addDays(monday, weekday);
      if (day >= firstDay) yield day;
    }
  }
}

/** The dates from `fromDay` on (by when they are, moved or not), at most `count`, cancelled ones included. */
export function eventDates(rule: EventRepeat, fromDay: string, count: number): EventDate[] {
  const time = rule.start.slice(11, 16);
  const lastLookedAt = addDays(fromDay, MAX_DAYS_LOOKED_AT);
  const dates: EventDate[] = [];
  // A date moved later can let later ones come before it: a few more are looked at, then sorted and cut.
  const looked = count + Object.keys(rule.changes).length;
  for (const day of usualDays(rule)) {
    if ((rule.until && day > rule.until) || day > lastLookedAt || dates.length >= looked) break;
    const change = rule.changes[day];
    const startsAt = typeof change === 'string' ? change : `${day}T${time}`;
    if (startsAt.slice(0, 10) < fromDay) continue;
    dates.push({ day, startsAt, isCancelled: change === null, isMoved: typeof change === 'string' });
  }
  return dates.sort((a, b) => a.startsAt.localeCompare(b.startsAt)).slice(0, count);
}

const shopToday = (now: Date) => toShopDateTime(now).slice(0, 10);

/** The next date that isn't cancelled, from today on (today's counts all day, like a one-off event); null after the last. */
export function nextEventStart(rule: EventRepeat, now = new Date()) {
  const next = eventDates(rule, shopToday(now), MAX_DAYS_LOOKED_AT).find((date) => !date.isCancelled);
  return next ? fromShopDateTime(next.startsAt) : null;
}

/** The upcoming dates to show, cancelled ones included, from today on. */
export const upcomingEventDates = (rule: EventRepeat, count: number, now = new Date()) => eventDates(rule, shopToday(now), count);

/** The repeat columns of a listing. */
export interface RepeatColumns {
  repeatFrequency: string | null;
  repeatStart: Date | null;
  repeatWeekdays: number[];
  repeatMonthlyBy: string | null;
  repeatUntil: Date | null;
  eventDateChanges: EventDateChanges;
}

/** The repeat columns a listing query selects, for repeatOf. */
export const REPEAT_SELECT = {
  repeatFrequency: true,
  repeatStart: true,
  repeatWeekdays: true,
  repeatMonthlyBy: true,
  repeatUntil: true,
  eventDateChanges: true,
} as const;

/** The rule saved on a listing (its changes come back as plain JSON), or null for a one-off event. */
export function repeatOf(columns: (Omit<RepeatColumns, 'eventDateChanges'> & { eventDateChanges: unknown }) | null | undefined): EventRepeat | null {
  if (!columns?.repeatFrequency || !columns.repeatStart || !REPEAT_FREQUENCIES.includes(columns.repeatFrequency as RepeatFrequency)) return null;
  return {
    frequency: columns.repeatFrequency as RepeatFrequency,
    start: toShopDateTime(columns.repeatStart),
    weekdays: columns.repeatWeekdays,
    monthlyBy: columns.repeatMonthlyBy === 'day' ? 'day' : 'weekday',
    until: columns.repeatUntil ? toShopDateTime(columns.repeatUntil).slice(0, 10) : null,
    changes: (columns.eventDateChanges ?? {}) as EventDateChanges,
  };
}

/** What a save sends for the repeat: the rule without its start, which is the event's "Fecha y hora". */
export interface RepeatInput {
  frequency: RepeatFrequency;
  weekdays: number[];
  monthlyBy: MonthlyBy;
  /** "" for no end. */
  until: string;
  changes: EventDateChanges;
}

/** The rule a save asks for, from the event's first date. */
export const toRepeat = (start: Date, input: RepeatInput): EventRepeat => ({ ...input, start: toShopDateTime(start), until: input.until || null });

/** The columns a save writes: the rule, or none for a one-off event. */
export function repeatColumns(start: Date | null, input: RepeatInput | null): RepeatColumns {
  if (!start || !input) return { repeatFrequency: null, repeatStart: null, repeatWeekdays: [], repeatMonthlyBy: null, repeatUntil: null, eventDateChanges: {} };
  const rule = toRepeat(start, input);
  return {
    repeatFrequency: rule.frequency,
    repeatStart: start,
    repeatWeekdays: rule.frequency === 'monthly' ? [] : rule.weekdays.length > 0 ? rule.weekdays : [weekdayOf(rule.start.slice(0, 10))],
    repeatMonthlyBy: rule.frequency === 'monthly' ? rule.monthlyBy : null,
    repeatUntil: rule.until ? fromShopDateTime(`${rule.until}T00:00`) : null,
    eventDateChanges: rule.changes,
  };
}

/** The weekday's name in the visitor's language: "jueves", "Thursday". A day in 2024 that was a Monday counts from. */
const weekdayName = (weekday: number, locale: string) =>
  new Date(Date.UTC(2024, 0, 1 + weekday)).toLocaleDateString(locale === 'en' ? 'en-GB' : locale, { weekday: 'long', timeZone: 'UTC' });

/** "Cada jueves · 19:00", "Cada mes, el tercer jueves · 19:00": the rule in the visitor's language. */
export function formatEventRepeat(rule: EventRepeat, locale: string, t: Translator) {
  const time = rule.start.slice(11, 16);
  const firstDay = rule.start.slice(0, 10);
  if (rule.frequency === 'monthly') {
    return rule.monthlyBy === 'day'
      ? t('EVENT_REPEAT_MONTHLY_DAY', { day: parseDay(firstDay).getUTCDate(), time })
      : t('EVENT_REPEAT_MONTHLY_WEEKDAY', { nth: t(`EVENT_NTH_${weekOfMonth(firstDay)}` as 'EVENT_NTH_0'), weekday: weekdayName(weekdayOf(firstDay), locale), time });
  }
  const weekdays = rule.weekdays.length > 0 ? [...rule.weekdays].sort((a, b) => a - b) : [weekdayOf(firstDay)];
  const days = new Intl.ListFormat(locale, { type: 'conjunction' }).format(weekdays.map((weekday) => weekdayName(weekday, locale)));
  return t(rule.frequency === 'weekly' ? 'EVENT_REPEAT_WEEKLY' : 'EVENT_REPEAT_BIWEEKLY', { days, time });
}

/** "Jue 26/11 · 19:00" for one of the dates, like a one-off event's date. */
export const formatRepeatDate = (date: EventDate, locale: string, todayLabel: string, now = new Date()) =>
  formatEventDate(fromShopDateTime(date.startsAt)!, locale, todayLabel, now, undefined, 'short');
