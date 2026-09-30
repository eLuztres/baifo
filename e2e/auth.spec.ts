import { expect, test } from '@playwright/test';
import { t } from './helpers';

test.describe('route protection for guests', () => {
  for (const path of ['/shipping-address', '/payment-method', '/place-order', '/user/profile', '/user/orders', '/admin/overview']) {
    test(`${path} redirects to sign-in`, async ({ page }) => {
      await page.goto(path);

      await expect(page).toHaveURL(/\/sign-in/);
      expect(new URL(page.url()).searchParams.get('callbackUrl')).toContain(path);
    });
  }
});

test.describe('sign in', () => {
  test('shows an error for wrong credentials', async ({ page }) => {
    await page.goto('/sign-in');

    await page.getByLabel('Email').fill('nobody-e2e@example.com');
    await page.getByLabel('Password').fill('wrong-password');
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page.getByText('Invalid email or password')).toBeVisible();
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test('links to sign up', async ({ page }) => {
    await page.goto('/sign-in');

    await page.getByRole('link', { name: 'Sign Up' }).click();
    await expect(page).toHaveURL('/sign-up');
  });

  // Only shown when the shop sets AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET
  test('offers Google sign-in when configured', async ({ page }) => {
    await page.goto('/sign-in');
    const google = page.getByRole('button', { name: t('SIGN_IN_WITH_GOOGLE') });
    test.skip((await google.count()) === 0, 'Google login is not configured');

    await expect(google).toBeVisible();
  });
});

test.describe('sign up', () => {
  // Validation fails before anything is written to the database
  test('rejects mismatched passwords', async ({ page }) => {
    await page.goto('/sign-up');

    await page.getByLabel('Name').fill('E2E Tester');
    await page.getByLabel('Email').fill('e2e-mismatch@example.com');
    await page.getByLabel('Password', { exact: true }).fill('secret123');
    await page.getByLabel('Confirm Password').fill('different123');
    await page.getByRole('button', { name: 'Sign Up' }).click();

    await expect(page.getByText("Passwords don't match")).toBeVisible();
    await expect(page).toHaveURL(/\/sign-up/);
  });

  test('rejects an invalid email', async ({ page }) => {
    await page.goto('/sign-up');

    await page.getByLabel('Name').fill('E2E Tester');
    await page.getByLabel('Email').fill('not-an-email');
    await page.getByLabel('Password', { exact: true }).fill('secret123');
    await page.getByLabel('Confirm Password').fill('secret123');
    await page.getByRole('button', { name: 'Sign Up' }).click();

    await expect(page.getByText('Invalid email address')).toBeVisible();
  });
});
