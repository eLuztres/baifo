import { SHOP_TIME_ZONE } from '@/lib/constants/currency';

/** "2026-11-29T19:00": a moment as the shop's clock shows it, the format of a datetime-local input. */
export function toShopDateTime(date: Date | string, timeZone = SHOP_TIME_ZONE) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(new Date(date))
      .map(({ type, value }) => [type, value])
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

/** The moment a "2026-11-29T19:00" on the shop's clock is, or null for anything else. */
export function fromShopDateTime(value: string, timeZone = SHOP_TIME_ZONE) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const asUtc = new Date(`${value}:00Z`);
  if (Number.isNaN(asUtc.getTime())) return null;
  // The shop's offset from UTC at about that moment, so summer and winter time both come out right.
  const offset = new Date(`${toShopDateTime(asUtc, timeZone)}:00Z`).getTime() - asUtc.getTime();
  return new Date(asUtc.getTime() - offset);
}

const shopDay = (date: Date | string, timeZone = SHOP_TIME_ZONE) => toShopDateTime(date, timeZone).slice(0, 10);

/** Midnight of today on the island: events from before it are over. */
export const startOfShopDay = (now = new Date(), timeZone = SHOP_TIME_ZONE) => fromShopDateTime(`${shopDay(now, timeZone)}T00:00`, timeZone)!;

export const isShopToday = (date: Date | string, now = new Date(), timeZone = SHOP_TIME_ZONE) => shopDay(date, timeZone) === shopDay(now, timeZone);

/** An event counts as over once its day is over, as only its start is known. */
export const isEventOver = (startsAt: Date | string, now = new Date(), timeZone = SHOP_TIME_ZONE) => shopDay(startsAt, timeZone) < shopDay(now, timeZone);

/** "Jueves 29/11 · 19:00", or "Hoy · 19:00" on the day itself; weekday and day/month in the visitor's language. */
export function formatEventDate(startsAt: Date | string, locale: string, todayLabel: string, now = new Date(), timeZone = SHOP_TIME_ZONE) {
  // English visitors on the island read day/month, not the US month/day.
  const format = (options: Intl.DateTimeFormatOptions) => new Date(startsAt).toLocaleString(locale === 'en' ? 'en-GB' : locale, { ...options, timeZone });
  const weekday = format({ weekday: 'long' });
  const day = isShopToday(startsAt, now, timeZone)
    ? todayLabel
    : `${weekday.charAt(0).toLocaleUpperCase(locale)}${weekday.slice(1)} ${format({ day: 'numeric', month: 'numeric' })}`;
  return `${day} · ${format({ hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })}`;
}
