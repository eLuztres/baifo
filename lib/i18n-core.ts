// Client-safe i18n: no dictionary JSON is imported here (only its type), so client
// components can use it without shipping the texts twice. Dictionaries live in lib/i18n.ts.
import type en from '@/resources/en.json';

export type TranslationKey = keyof typeof en;
export type Dictionary = Record<TranslationKey, string>;

export interface LocaleOption {
  id: 'en' | 'es' | 'de' | 'fr' | 'it';
  label: string;
  name: string;
}

export type Locale = LocaleOption['id'];

export const LOCALES: LocaleOption[] = [
  { id: 'en', label: 'EN', name: 'English' },
  { id: 'es', label: 'ES', name: 'Español' },
  { id: 'de', label: 'DE', name: 'Deutsch' },
  { id: 'fr', label: 'FR', name: 'Français' },
  { id: 'it', label: 'IT', name: 'Italiano' },
];

const LOCALE_IDS: string[] = LOCALES.map((locale) => locale.id);

export const DEFAULT_LOCALE: Locale = 'en';
export const LOCALE_COOKIE = 'NEXT_LOCALE';
// The middleware copies `?lang=` into this request header: a language in the URL is one Google can index.
export const URL_LOCALE_HEADER = 'x-url-locale';

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && LOCALE_IDS.includes(value);
}

/** `path` with `?lang=` set to `locale`, keeping its other parameters and its #part. */
export function withLang(path: string, locale: string) {
  const [beforeHash, hash] = path.split('#');
  const [pathname, query = ''] = beforeHash.split('?');
  const params = new URLSearchParams(query);
  params.set('lang', locale);
  return `${pathname}?${params}${hash === undefined ? '' : `#${hash}`}`;
}

/** The language a request's URL asks for: its own `?lang=`, or the one of the page on this site it came from. */
export function urlLocaleOf(url: URL, referer: string | null) {
  const own = url.searchParams.get('lang');
  if (own) return own;
  if (!referer) return null;
  try {
    const from = new URL(referer);
    // Only our own pages: a link on another site doesn't choose the language.
    return from.origin === url.origin ? from.searchParams.get('lang') : null;
  } catch {
    return null;
  }
}

export type Translator = (
  key: TranslationKey,
  vars?: Record<string, string | number>
) => string;

/** Build a translator; `{name}` placeholders are filled from `vars`. Unknown keys come back as is. */
export function createTranslator(dictionary: Dictionary): Translator {
  return (key, vars) => {
    // Own keys only: translateMessage passes arbitrary server text, e.g. "constructor".
    const text = Object.prototype.hasOwnProperty.call(dictionary, key) ? dictionary[key] : key;
    if (!vars) return text;
    return text.replace(/\{(\w+)\}/g, (match, name) =>
      name in vars ? String(vars[name]) : match
    );
  };
}

/** How formatError joins several messages (e.g. one per invalid field). */
export const MESSAGE_SEPARATOR = '. ';

/**
 * Translates a server or validation message: a translation key, several keys joined by
 * formatError, or plain text, which stays as is. Works with the server and client `t`.
 */
export function translateMessage(t: Translator, message: string): string {
  return message
    .split(MESSAGE_SEPARATOR)
    .map((part) => t(part as TranslationKey))
    .join(MESSAGE_SEPARATOR);
}
