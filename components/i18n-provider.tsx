'use client';

import { createContext, useContext, useMemo } from 'react';
import {
  createTranslator,
  type Dictionary,
  type Locale,
  type Translator,
} from '@/lib/i18n';

const I18nContext = createContext<{ locale: Locale; locales: Locale[]; t: Translator } | null>(null);

export function I18nProvider({
  locale,
  locales,
  dictionary,
  children,
}: {
  locale: Locale;
  /** Languages enabled for this shop (LOCALES env var, only readable on the server). */
  locales: Locale[];
  dictionary: Dictionary;
  children: React.ReactNode;
}) {
  const value = useMemo(
    () => ({ locale, locales, t: createTranslator(dictionary) }),
    [locale, locales, dictionary]
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/** Translations for client components. */
export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>');
  return ctx;
}
