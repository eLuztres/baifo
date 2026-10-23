import { DEFAULT_LOCALE, isLocale, type Locale } from '@/lib/i18n';

/** The shop's own language (DEFAULT_LOCALE): for shop alerts, and for customers whose language is unknown. */
export function getShopLocale(): Locale {
  const configured = process.env.DEFAULT_LOCALE;
  return isLocale(configured) ? configured : DEFAULT_LOCALE;
}
