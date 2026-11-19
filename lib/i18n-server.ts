import { cookies, headers } from 'next/headers';
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  LOCALES,
  URL_LOCALE_HEADER,
  getTranslator,
  isLocale,
  type Locale,
} from '@/lib/i18n';

/** Languages this shop offers, from `LOCALES=en,de` (all when unset). */
export function getEnabledLocales(): Locale[] {
  const configured = (process.env.LOCALES ?? '')
    .split(',')
    .map((locale) => locale.trim())
    .filter(isLocale);
  return configured.length > 0 ? configured : LOCALES.map((l) => l.id);
}

// Baifo's order: Spanish, then English, Italian, German and French.
const PICTURE_FALLBACK_ORDER: Locale[] = ['es', 'en', 'it', 'de', 'fr'];

/** Whose pictures a visitor sees when none are meant for their language: the first of these that has some
    (`PICTURE_FALLBACK_LANGUAGES=es,en,it,de,fr`). */
export function getPictureFallbackLocales(): Locale[] {
  const configured = (process.env.PICTURE_FALLBACK_LANGUAGES ?? '')
    .split(',')
    .map((locale) => locale.trim())
    .filter(isLocale);
  return configured.length > 0 ? configured : PICTURE_FALLBACK_ORDER;
}

function getDefaultLocale(enabled: Locale[]): Locale {
  const configured = process.env.DEFAULT_LOCALE;
  if (isLocale(configured) && enabled.includes(configured)) return configured;
  return enabled.includes(DEFAULT_LOCALE) ? DEFAULT_LOCALE : enabled[0];
}

/** The shop's own language (DEFAULT_LOCALE), e.g. the one its texts are first written in. */
export const getShopLocale = (): Locale => getDefaultLocale(getEnabledLocales());

const isEnabled = (value?: string | null): value is Locale => isLocale(value) && getEnabledLocales().includes(value);

/**
 * The visitor's language: the one in the URL (`?lang=`) first, then their
 * saved choice (cookie), then the browser's preferred languages, then the shop's default.
 */
export async function getLocale(): Promise<Locale> {
  const inUrl = (await headers()).get(URL_LOCALE_HEADER);
  return isEnabled(inUrl) ? inUrl : getOwnLocale();
}

/** The visitor's own language, leaving out the URL's: saved choice, browser, then the shop's default. */
export async function getOwnLocale(): Promise<Locale> {
  const requestHeaders = await headers();
  const saved = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isEnabled(saved)) return saved;

  const accepted = requestHeaders.get('accept-language') ?? '';
  for (const part of accepted.split(',')) {
    const code = part.split(';')[0].trim().slice(0, 2).toLowerCase();
    if (isEnabled(code)) return code;
  }

  return getShopLocale();
}

export async function getT() {
  const locale = await getLocale();
  return { t: getTranslator(locale), locale };
}
