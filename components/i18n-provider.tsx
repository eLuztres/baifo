'use client';

import { createContext, useCallback, useContext, useMemo } from 'react';
import {
  createTranslator,
  translateMessage,
  type Dictionary,
  type Locale,
  type Translator,
} from '@/lib/i18n-core';

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

/**
 * Translates server-action and validation messages (keys or plain text, see translateMessage).
 * Shared UI primitives use it, so outside <I18nProvider> messages show as is instead of throwing.
 */
export function useTranslateMessage() {
  const t = useContext(I18nContext)?.t;
  return useCallback((message: string) => (t ? translateMessage(t, message) : message), [t]);
}
