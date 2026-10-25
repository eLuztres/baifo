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

function getDefaultLocale(enabled: Locale[]): Locale {
  const configured = process.env.DEFAULT_LOCALE;
  if (isLocale(configured) && enabled.includes(configured)) return configured;
  return enabled.includes(DEFAULT_LOCALE) ? DEFAULT_LOCALE : enabled[0];
}

/** The shop's own language (DEFAULT_LOCALE), e.g. the one its texts are first written in. */
export const getShopLocale = (): Locale => getDefaultLocale(getEnabledLocales());

/**
 * The visitor's language: the one in the URL (`?lang=`) first, then their
 * saved choice (cookie), then the browser's preferred languages, then the shop's default.
 */
export async function getLocale(): Promise<Locale> {
  const enabled = getEnabledLocales();
  const isEnabled = (value?: string | null): value is Locale =>
    isLocale(value) && enabled.includes(value);

  const requestHeaders = await headers();
  const inUrl = requestHeaders.get(URL_LOCALE_HEADER);
  if (isEnabled(inUrl)) return inUrl;

  const saved = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isEnabled(saved)) return saved;

  const accepted = requestHeaders.get('accept-language') ?? '';
  for (const part of accepted.split(',')) {
    const code = part.split(';')[0].trim().slice(0, 2).toLowerCase();
    if (isEnabled(code)) return code;
  }

  return getDefaultLocale(enabled);
}

export async function getT() {
  const locale = await getLocale();
  return { t: getTranslator(locale), locale };
}
