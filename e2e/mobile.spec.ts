import { expect, test } from '@playwright/test';
import { otherEnabledLocales, t, tIn } from './helpers';

test.describe('mobile header', () => {
  test('the menu opens and its listings link opens the list', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: t('NAV_MENU') }).click();
    await page.getByRole('dialog').getByRole('link', { name: t('NAV_SHOWROOM') }).click();

    await expect(page).toHaveURL(/\/explore$/);
    await expect(page.locator('[data-feed-page]')).toBeVisible();
  });

  test('the language pills switch language', async ({ page }) => {
    await page.goto('/explore');
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: t('NAV_MENU') }).click();
    // Counted only once the menu is open, so a shop with several languages never looks like one with one.
    await expect(page.getByRole('dialog')).toBeVisible();

    const pills = page.getByRole('dialog').getByRole('group', { name: t('LANGUAGE_LABEL') });
    test.skip((await pills.count()) === 0, 'The shop has a single language');
    const [locale] = await otherEnabledLocales(page, '[role="group"] button[lang]');
    await pills.locator(`button[lang="${locale}"]`).click();

    await expect(page.getByRole('group', { name: tIn(locale)('LANGUAGE_LABEL') })).toBeVisible();
  });
});
