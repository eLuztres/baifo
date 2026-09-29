import { cookies, headers } from 'next/headers';
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  LOCALES,
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

/**
 * The visitor's language: their saved choice (cookie) first, then the
 * browser's preferred languages, then the shop's default.
 */
export async function getLocale(): Promise<Locale> {
  const enabled = getEnabledLocales();
  const isEnabled = (value?: string | null): value is Locale =>
    isLocale(value) && enabled.includes(value);

  const saved = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isEnabled(saved)) return saved;

  const accepted = (await headers()).get('accept-language') ?? '';
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
