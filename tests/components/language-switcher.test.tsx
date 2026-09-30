/** @jest-environment jsdom */
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LanguageSwitcher from '@/components/shared/header/language-switcher';
import { LOCALE_COOKIE, LOCALES, getDictionary } from '@/lib/i18n';
import { renderWithI18n } from '../utils/render-with-i18n';

const mockRefresh = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh: mockRefresh }) }));

beforeEach(() => {
  document.cookie = `${LOCALE_COOKIE}=; max-age=0; path=/`;
});

describe('LanguageSwitcher (pills)', () => {
  it('renders one button per locale and marks the current one', () => {
    renderWithI18n(<LanguageSwitcher />, { locale: 'de' });

    const group = screen.getByRole('group', { name: getDictionary('de').LANGUAGE_LABEL });
    expect(group).toBeInTheDocument();
    for (const { label, id } of LOCALES) {
      expect(screen.getByRole('button', { name: label })).toHaveAttribute(
        'aria-pressed',
        String(id === 'de')
      );
    }
  });

  it('saves the new locale in a cookie and refreshes the page', async () => {
    renderWithI18n(<LanguageSwitcher />);

    await userEvent.click(screen.getByRole('button', { name: 'ES' }));

    expect(document.cookie).toContain(`${LOCALE_COOKIE}=es`);
    await waitFor(() => expect(mockRefresh).toHaveBeenCalledTimes(1));
  });

  it('does nothing when the current locale is chosen again', async () => {
    renderWithI18n(<LanguageSwitcher />);

    await userEvent.click(screen.getByRole('button', { name: 'EN' }));

    expect(document.cookie).not.toContain(LOCALE_COOKIE);
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it('offers only the languages the shop has enabled', () => {
    renderWithI18n(<LanguageSwitcher />, { locales: ['en', 'de'] });

    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual(['EN', 'DE']);
  });

  it('is hidden when the shop has a single language', () => {
    const { container } = renderWithI18n(<LanguageSwitcher />, { locales: ['en'] });
    expect(container).toBeEmptyDOMElement();
  });
});

describe('LanguageSwitcher (compact)', () => {
  it('shows the current language on the trigger', () => {
    renderWithI18n(<LanguageSwitcher variant='compact' />, { locale: 'fr' });

    expect(screen.getByRole('button', { name: /français/i })).toHaveTextContent('FR');
  });
});
