// Server side (and emails, tests): imports every dictionary. Client components use '@/lib/i18n-core'.
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
import {
  DEFAULT_LOCALE,
  createTranslator,
  type Dictionary,
  type Locale,
  type Translator,
} from '@/lib/i18n-core';

export * from '@/lib/i18n-core';

// Typed as full dictionaries so a missing key in any language fails the build.
const dictionaries = { en, es, de, fr, it } satisfies Record<Locale, Dictionary>;

// Shop-specific wording lives in brand/messages/*.json and overrides the base texts per key.
const brandMessages = {
  en: brandEn,
  es: brandEs,
  de: brandDe,
  fr: brandFr,
  it: brandIt,
} satisfies Record<Locale, Partial<Dictionary>>;

export function getDictionary(locale: Locale = DEFAULT_LOCALE): Dictionary {
  return { ...dictionaries[locale], ...brandMessages[locale] };
}

export function getTranslator(locale: Locale = DEFAULT_LOCALE): Translator {
  return createTranslator(getDictionary(locale));
}
