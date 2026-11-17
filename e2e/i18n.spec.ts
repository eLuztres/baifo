import { expect, test } from '@playwright/test';
import { otherEnabledLocales, t, tIn } from './helpers';

const SWITCHER_ITEMS = '[role="menuitem"][lang]';

test.describe('language', () => {
  test('switching language updates the page and is remembered', async ({ page, context }) => {
    await page.goto('/explore');
    // The menu works only once the page is live in the browser.
    await page.waitForLoadState('networkidle');
    const switcher = page.getByRole('button', { name: new RegExp(`^${t('LANGUAGE_LABEL')}:`) });
    test.skip((await switcher.count()) === 0, 'The shop has a single language');

    await switcher.click();
    const [locale] = await otherEnabledLocales(page, SWITCHER_ITEMS);
    await page.locator(`${SWITCHER_ITEMS}[lang="${locale}"]`).click();

    await expect(page.locator('html')).toHaveAttribute('lang', locale);
    await expect(page.getByRole('combobox', { name: tIn(locale)('EXPLORE_SEARCH_LABEL') })).toBeVisible();
    const cookies = await context.cookies();
    expect(cookies.find((c) => c.name === 'NEXT_LOCALE')?.value).toBe(locale);

    await page.goto('/sign-in');
    await expect(page.getByRole('button', { name: tIn(locale)('SIGN_IN') })).toBeVisible();
  });

  test('follows the browser language on the first visit', async ({ page, browser }) => {
    await page.goto('/explore');
    await page.waitForLoadState('networkidle');
    const switcher = page.getByRole('button', { name: new RegExp(`^${t('LANGUAGE_LABEL')}:`) });
    test.skip((await switcher.count()) === 0, 'The shop has a single language');
    await switcher.click();
    const [locale] = await otherEnabledLocales(page, SWITCHER_ITEMS);

    const context = await browser.newContext({ locale });
    const localized = await context.newPage();
    await localized.goto('/explore');

    await expect(localized.locator('html')).toHaveAttribute('lang', locale);
    await expect(localized.getByRole('combobox', { name: tIn(locale)('EXPLORE_SEARCH_LABEL') })).toBeVisible();
    await context.close();
  });
});
