import { expect, test } from '@playwright/test';
import { t } from './helpers';

test.describe('storefront navigation', () => {
  test('home page loads with the header', async ({ page }) => {
    await page.goto('/');

    expect(await page.title()).not.toBe('');
  });

  test('the listings link in the header opens the list', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('navigation').getByRole('link', { name: t('NAV_SHOWROOM') }).click();

    await expect(page).toHaveURL(/\/explore$/);
    await expect(page.locator('[data-feed-page]')).toBeVisible();
  });

  test('a listing card opens its page, and the way back returns to the list', async ({ page }) => {
    await page.goto('/explore');
    const tiles = page.locator('[data-feed-page] a[href^="/product/"]');
    test.skip((await tiles.count()) === 0, 'No products in the database');

    const name = (await tiles.first().locator('p').first().textContent())!.trim();
    await tiles.first().click();

    await expect(page).toHaveURL(/\/product\/.+/);
    await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
    await expect(page.getByRole('link', { name: t('BACK_TO_SHOP') })).toHaveAttribute('href', '/explore');
  });

  test('unknown pages show the 404 page', async ({ page }) => {
    const response = await page.goto('/this-page-does-not-exist');

    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { name: t('NOT_FOUND_TITLE') })).toBeVisible();
    await expect(page.getByRole('link', { name: t('NOT_FOUND_SHOP') })).toHaveAttribute('href', '/explore');
  });

  // Content only: app/loading.tsx streams first, so the status is a soft-404 200
  test('an unknown product slug shows the 404 page', async ({ page }) => {
    await page.goto('/product/does-not-exist-e2e');
    await expect(page.getByRole('heading', { name: t('NOT_FOUND_TITLE') })).toBeVisible();
  });
});
