import { expect, test } from '@playwright/test';
import { t } from './helpers';

test.describe('storefront navigation', () => {
  test('home page loads with the header', async ({ page }) => {
    await page.goto('/');

    expect(await page.title()).not.toBe('');
    await expect(page.getByRole('link', { name: new RegExp(`${t('NAV_CART')} \\(\\d+\\)`) })).toBeVisible();
  });

  test('header links reach the shop', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('navigation').getByRole('link', { name: t('NAV_SHOP') }).click();

    await expect(page).toHaveURL('/store');
    await expect(page.getByRole('heading', { name: t('STORE_TITLE') })).toBeVisible();
  });

  test('a product card opens its product page', async ({ page }) => {
    await page.goto('/store');
    const cards = page.locator('article');
    test.skip((await cards.count()) === 0, 'No products in the database');

    const name = (await cards.first().getByRole('heading').textContent())!.trim();
    await cards.first().getByRole('heading').click();

    await expect(page).toHaveURL(/\/product\/.+/);
    await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
    await expect(page.getByRole('link', { name: t('BACK_TO_SHOP') })).toHaveAttribute('href', '/store');
  });

  test('unknown pages show the 404 page', async ({ page }) => {
    const response = await page.goto('/this-page-does-not-exist');

    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { name: t('NOT_FOUND_TITLE') })).toBeVisible();
    await expect(page.getByRole('link', { name: t('NOT_FOUND_SHOP') })).toHaveAttribute('href', '/store');
  });

  // Content only: app/loading.tsx streams first, so the status is a soft-404 200
  test('an unknown product slug shows the 404 page', async ({ page }) => {
    await page.goto('/product/does-not-exist-e2e');
    await expect(page.getByRole('heading', { name: t('NOT_FOUND_TITLE') })).toBeVisible();
  });
});
