import en from '@/resources/en.json';
import es from '@/resources/es.json';
import de from '@/resources/de.json';
import fr from '@/resources/fr.json';
import it from '@/resources/it.json';
import brandEn from '@/brand/messages/en.json';
import brandEs from '@/brand/messages/es.json';
import brandDe from '@/brand/messages/de.json';
import brandFr from '@/brand/messages/fr.json';
import brandIt from '@/brand/messages/it.json';

export type TranslationKey = keyof typeof en;
export type Dictionary = Record<TranslationKey, string>;

// Typed as full dictionaries so a missing key in any language fails the build.
const dictionaries = { en, es, de, fr, it } satisfies Record<string, Dictionary>;

export type Locale = keyof typeof dictionaries;

// Shop-specific wording lives in brand/messages/*.json and overrides the base texts per key.
const brandMessages = {
  en: brandEn,
  es: brandEs,
  de: brandDe,
  fr: brandFr,
  it: brandIt,
} satisfies Record<Locale, Partial<Dictionary>>;

export const LOCALES: { id: Locale; label: string; name: string }[] = [
  { id: 'en', label: 'EN', name: 'English' },
  { id: 'es', label: 'ES', name: 'Español' },
  { id: 'de', label: 'DE', name: 'Deutsch' },
  { id: 'fr', label: 'FR', name: 'Français' },
  { id: 'it', label: 'IT', name: 'Italiano' },
];

export const DEFAULT_LOCALE: Locale = 'en';
export const LOCALE_COOKIE = 'NEXT_LOCALE';

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && value in dictionaries;
}

export function getDictionary(locale: Locale = DEFAULT_LOCALE): Dictionary {
  return { ...dictionaries[locale], ...brandMessages[locale] };
}

export type Translator = (
  key: TranslationKey,
  vars?: Record<string, string | number>
) => string;

/** Build a translator; `{name}` placeholders are filled from `vars`. */
export function createTranslator(dictionary: Dictionary): Translator {
  return (key, vars) => {
    const text = dictionary[key] ?? en[key];
    if (!vars) return text;
    return text.replace(/\{(\w+)\}/g, (match, name) =>
      name in vars ? String(vars[name]) : match
    );
  };
}

export function getTranslator(locale: Locale = DEFAULT_LOCALE): Translator {
  return createTranslator(getDictionary(locale));
}
