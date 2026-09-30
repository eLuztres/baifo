/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { useI18n } from '@/components/i18n-provider';
import { createTranslator, getDictionary, type Locale } from '@/lib/i18n';
import { renderWithI18n } from '../utils/render-with-i18n';

function Greeting() {
  const { t, locale } = useI18n();
  return (
    <p>
      {locale}: {t('TOAST_ADDED', { name: 'Lamp' })}
    </p>
  );
}

const expected = (locale: Locale) =>
  `${locale}: ${createTranslator(getDictionary(locale))('TOAST_ADDED', { name: 'Lamp' })}`;

describe('I18nProvider / useI18n', () => {
  it('translates with the given locale and fills placeholders', () => {
    renderWithI18n(<Greeting />);
    expect(screen.getByText(expected('en'))).toBeInTheDocument();
  });

  it('switches language with the locale', () => {
    renderWithI18n(<Greeting />, { locale: 'es' });
    expect(screen.getByText(expected('es'))).toBeInTheDocument();
    expect(expected('es')).not.toBe(expected('en').replace('en:', 'es:'));
  });

  it('throws a clear error outside the provider', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Greeting />)).toThrow('useI18n must be used inside <I18nProvider>');
  });
});
