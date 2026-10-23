import { expect, test } from '@playwright/test';
import { openFirstInStockProduct, skipUnlessWritesAllowed, t } from './helpers';

test('a new visitor sees an empty cart', async ({ page }) => {
  await page.goto('/cart');

  await expect(page.getByText(t('CART_EMPTY_TITLE'))).toBeVisible();
  await page.getByRole('link', { name: t('CART_EMPTY_CTA') }).click();
  await expect(page).toHaveURL('/#showroom');
});

test.describe('cart (writes to the database)', () => {
  skipUnlessWritesAllowed();

  test('add, increase, decrease and remove a product', async ({ page }) => {
    const name = await openFirstInStockProduct(page);

    await page.getByRole('button', { name: t('ADD_TO_CART') }).click();
    await expect(page.getByText(t('TOAST_ADDED', { name }))).toBeVisible();
    await expect(page.getByRole('link', { name: `${t('NAV_CART')} (1)` })).toBeVisible();

    await page.getByRole('link', { name: t('VIEW_CART') }).click();
    await expect(page).toHaveURL('/cart');
    const row = page.getByRole('row').filter({ hasText: name });
    await expect(row).toBeVisible();

    await row.getByRole('button', { name: t('ADD_ONE') }).click();
    await expect(page.getByText(t('CART_SUBTOTAL', { count: 2 }))).toBeVisible();

    await row.getByRole('button', { name: t('REMOVE_ONE') }).click();
    await expect(page.getByText(t('CART_SUBTOTAL', { count: 1 }))).toBeVisible();

    await row.getByRole('button', { name: t('REMOVE_ONE') }).click();
    await expect(page.getByText(t('CART_EMPTY_TITLE'))).toBeVisible();
  });

  test('checkout from the cart asks a guest to sign in', async ({ page }) => {
    await openFirstInStockProduct(page);
    await page.getByRole('button', { name: t('ADD_TO_CART') }).click();
    await expect(page.getByRole('link', { name: `${t('NAV_CART')} (1)` })).toBeVisible();

    await page.goto('/cart');
    await page.getByRole('button', { name: t('CART_CHECKOUT') }).click();

    await expect(page).toHaveURL(/\/sign-in\?callbackUrl=.*shipping-address/);
  });
});
