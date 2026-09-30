import { expect, test } from '@playwright/test';
import { otherEnabledLocales, t, tIn } from './helpers';

const SWITCHER_ITEMS = '[role="menuitem"][lang]';

test.describe('language', () => {
  test('switching language updates the page and is remembered', async ({ page, context }) => {
    await page.goto('/store');
    const switcher = page.getByRole('button', { name: new RegExp(`^${t('LANGUAGE_LABEL')}:`) });
    test.skip((await switcher.count()) === 0, 'The shop has a single language');

    await switcher.click();
    const [locale] = await otherEnabledLocales(page, SWITCHER_ITEMS);
    await page.locator(`${SWITCHER_ITEMS}[lang="${locale}"]`).click();

    await expect(page.getByRole('heading', { name: tIn(locale)('STORE_TITLE') })).toBeVisible();
    const cookies = await context.cookies();
    expect(cookies.find((c) => c.name === 'NEXT_LOCALE')?.value).toBe(locale);

    await page.goto('/cart');
    await expect(page.getByText(tIn(locale)('CART_EMPTY_TITLE'))).toBeVisible();
  });

  test('follows the browser language on the first visit', async ({ page, browser }) => {
    await page.goto('/store');
    const switcher = page.getByRole('button', { name: new RegExp(`^${t('LANGUAGE_LABEL')}:`) });
    test.skip((await switcher.count()) === 0, 'The shop has a single language');
    await switcher.click();
    const [locale] = await otherEnabledLocales(page, SWITCHER_ITEMS);

    const context = await browser.newContext({ locale });
    const localized = await context.newPage();
    await localized.goto('/store');

    await expect(localized.getByRole('heading', { name: tIn(locale)('STORE_TITLE') })).toBeVisible();
    await context.close();
  });
});
