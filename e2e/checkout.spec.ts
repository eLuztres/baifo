import { expect, test } from '@playwright/test';
import { openFirstInStockProduct, signIn, skipUnlessWritesAllowed, t } from './helpers';

// A regular (non-admin) user that exists in the test database
const EMAIL = process.env.E2E_USER_EMAIL ?? '';
const PASSWORD = process.env.E2E_USER_PASSWORD ?? '';

test.describe('checkout (writes to the database)', () => {
  skipUnlessWritesAllowed();
  test.skip(!EMAIL || !PASSWORD, 'Set E2E_USER_EMAIL and E2E_USER_PASSWORD');

  test('a signed-in user places a cash-on-delivery order', async ({ page }) => {
    await signIn(page, EMAIL, PASSWORD);
    const name = await openFirstInStockProduct(page);
    await page.getByRole('button', { name: t('ADD_TO_CART') }).click();
    await expect(page.getByRole('link', { name: t('VIEW_CART') })).toBeVisible();

    await page.goto('/cart');
    await page.getByRole('button', { name: t('CART_CHECKOUT') }).click();
    await expect(page).toHaveURL('/shipping-address');

    await page.getByLabel('Full Name').fill('E2E Tester');
    await page.getByLabel('Address').fill('Calle Mayor 1');
    await page.getByLabel('City').fill('Las Palmas');
    await page.getByLabel('Postal Code').fill('35001');
    await page.getByLabel('Country').fill('Spain');
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page).toHaveURL('/payment-method');

    const cashOnDelivery = page.getByRole('radio', { name: 'CashOnDelivery' });
    test.skip((await cashOnDelivery.count()) === 0, 'CashOnDelivery is not in PAYMENT_METHODS');
    await cashOnDelivery.click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page).toHaveURL('/place-order');
    await expect(page.getByText(name).first()).toBeVisible();

    await page.getByRole('button', { name: 'Place Order' }).click();

    await expect(page).toHaveURL(/\/order\/[0-9a-f-]{36}$/);
    await expect(page.getByText(name).first()).toBeVisible();
    await expect(page.getByText(/not paid/i)).toBeVisible();
  });

  test('a regular user cannot open the admin area', async ({ page }) => {
    await signIn(page, EMAIL, PASSWORD);

    await page.goto('/admin/overview');

    await expect(page).toHaveURL('/admin/unauthorized');
    await expect(page.getByRole('heading', { name: 'Unauthorized Access' })).toBeVisible();
  });
});
