import { expect, test } from '@playwright/test';
import { SIGN_UP_BY_INVITE, t } from './helpers';

test.describe('route protection for guests', () => {
  for (const path of ['/user/profile', '/admin/overview']) {
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

    // A new address each run: after a few wrong passwords for one address the shop blocks it for 15 minutes.
    await page.getByLabel('Email').fill(`nobody-e2e-${Date.now()}@example.com`);
    await page.getByLabel('Password').fill('wrong-password');
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page.getByText(t('AUTH_INVALID_CREDENTIALS'))).toBeVisible();
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test('links to sign up, unless accounts are by invitation', async ({ page }) => {
    await page.goto('/sign-in');

    if (SIGN_UP_BY_INVITE) {
      await expect(page.getByRole('button', { name: t('SIGN_IN') })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Sign Up' })).toHaveCount(0);
      return;
    }
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

test.describe('sign up by invitation only', () => {
  test.skip(!SIGN_UP_BY_INVITE, 'This shop lets anyone sign up');

  test('shows the invitation text and no form without an invite', async ({ page }) => {
    await page.goto('/sign-up');

    await expect(page.getByText(t('AUTH_INVITE_ONLY_TITLE'))).toBeVisible();
    await expect(page.getByLabel('Confirm Password')).toHaveCount(0);
    await expect(page.getByRole('link', { name: new RegExp(t('SIGN_IN')) })).toHaveAttribute('href', '/sign-in');
  });
});

test.describe('sign up', () => {
  test.skip(SIGN_UP_BY_INVITE, 'Accounts are by invitation: the form only shows with an invite');

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
