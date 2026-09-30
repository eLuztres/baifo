import { expect, test } from '@playwright/test';
import { otherEnabledLocales, t, tIn } from './helpers';

test.describe('mobile header', () => {
  test('the menu opens and navigates to the shop', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: t('NAV_MENU') }).click();
    await page.getByRole('dialog').getByRole('link', { name: t('NAV_SHOP') }).click();

    await expect(page).toHaveURL('/store');
  });

  test('the language pills switch language', async ({ page }) => {
    await page.goto('/store');
    await page.getByRole('button', { name: t('NAV_MENU') }).click();

    const pills = page.getByRole('group', { name: t('LANGUAGE_LABEL') });
    test.skip((await pills.count()) === 0, 'The shop has a single language');
    const [locale] = await otherEnabledLocales(page, '[role="group"] button[lang]');
    await pills.locator(`button[lang="${locale}"]`).click();

    await expect(page.getByRole('group', { name: tIn(locale)('LANGUAGE_LABEL') })).toBeVisible();
  });
});
