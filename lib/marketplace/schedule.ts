import { fromShopDateTime, startOfShopDay, toShopDateTime } from '@/lib/event-date';

const DAY_MS = 24 * 60 * 60 * 1000;

/** "Online desde" is still ahead: the listing waits for the nightly run. */
export const isScheduled = ({ publishAt }: { publishAt: Date | string | null }, now = new Date()) => Boolean(publishAt && new Date(publishAt) > now);

/** "Online desde" (YYYY-MM-DD) as the moment it starts, midnight on the island; today, a past day or none: null, online at once. */
export function publishAtOf(day: string | null | undefined, now = new Date()) {
  const start = day ? fromShopDateTime(`${day}T00:00`) : null;
  return start && start > now ? start : null;
}

/** The day after the last one taken (YYYY-MM-DD), today at the earliest: where the next of a series of daily listings goes. */
export function nextFreeDay(takenDays: (Date | string)[], now = new Date()) {
  const today = startOfShopDay(now).getTime();
  const last = Math.max(today - DAY_MS, ...takenDays.map((day) => startOfShopDay(new Date(day)).getTime()));
  // Midday, so a change of summer time never lands on the wrong day.
  return toShopDateTime(new Date(last + DAY_MS + DAY_MS / 2)).slice(0, 10);
}
