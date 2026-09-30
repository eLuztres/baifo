import { render, type RenderOptions } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { I18nProvider } from '@/components/i18n-provider';
import { LOCALES, createTranslator, getDictionary, type Locale } from '@/lib/i18n';

interface I18nRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  locale?: Locale;
  locales?: Locale[];
}

// Expected texts come from the dictionary, so a shop's brand/messages overrides don't break tests
export const t = createTranslator(getDictionary('en'));

// Client components call useI18n(), so they must render inside the provider.
export function renderWithI18n(
  ui: ReactElement,
  { locale = 'en', locales = LOCALES.map((l) => l.id), ...options }: I18nRenderOptions = {}
) {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <I18nProvider locale={locale} locales={locales} dictionary={getDictionary(locale)}>
      {children}
    </I18nProvider>
  );
  return render(ui, { wrapper: Wrapper, ...options });
}
