import { expect, test, type Page } from '@playwright/test';
import { loadEnvConfig } from '@next/env';
import { PrismaClient } from '@prisma/client';
import { openFirstInStockProduct, signIn, skipUnlessWritesAllowed, t } from './helpers';

// Full login journeys against a throwaway database: sign up, sign in/out, roles,
// deleted users, guest cart. Every user it creates is removed again afterwards.
loadEnvConfig(process.cwd(), false, { info() {}, error: console.error });
const prisma = new PrismaClient();

const RUN_ID = Date.now().toString(36);
const PASSWORD = 'e2e-Secret-123';
let userCount = 0;

skipUnlessWritesAllowed();

test.afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { startsWith: `e2e-auth-${RUN_ID}-` } } });
  await prisma.$disconnect();
});

const newEmail = () => `e2e-auth-${RUN_ID}-${++userCount}@example.test`;

async function signUp(page: Page, name: string, email: string, callbackUrl = '/') {
  await page.goto(`/sign-up?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  await page.getByLabel('Name').fill(name);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByLabel('Confirm Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign Up' }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/sign-up'));
}

const accountMenu = (page: Page) => page.getByRole('button', { name: t('ACCOUNT_MENU') });
const signInLink = (page: Page) => page.getByRole('link', { name: t('SIGN_IN') });

async function signOut(page: Page) {
  await accountMenu(page).click();
  await page.getByRole('button', { name: t('SIGN_OUT') }).click();
  await expect(signInLink(page)).toBeVisible();
}

async function setRole(email: string, role: 'admin' | 'user') {
  await prisma.user.update({ where: { email }, data: { role } });
}

test.describe('sign up, sign in, sign out', () => {
  test('a new user signs up, is signed in, signs out and signs in again', async ({ page }) => {
    const email = newEmail();
    await signUp(page, 'Ada Ring', email, '/user/profile');

    await expect(page).toHaveURL('/user/profile');
    await expect(page.getByPlaceholder('Name')).toHaveValue('Ada Ring');

    await accountMenu(page).click();
    await expect(page.getByText(email)).toBeVisible();
    await page.keyboard.press('Escape');

    await signOut(page);
    await page.goto('/user/profile');
    await expect(page).toHaveURL(/\/sign-in\?callbackUrl=%2Fuser%2Fprofile/);

    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(PASSWORD);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page).toHaveURL('/user/profile');
  });

  test('the session survives a reload and a new tab', async ({ page, context }) => {
    await signUp(page, 'Ben Band', newEmail());

    await page.reload();
    await expect(accountMenu(page)).toBeVisible();

    const secondTab = await context.newPage();
    await secondTab.goto('/user/profile');
    await expect(secondTab).toHaveURL('/user/profile');
  });

  test('a wrong password for an existing user is rejected', async ({ page }) => {
    const email = newEmail();
    await signUp(page, 'Cleo Clasp', email);
    await signOut(page);

    await page.goto('/sign-in');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill('not-the-password');
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page.getByText('Invalid email or password')).toBeVisible();
    await expect(page).toHaveURL(/\/sign-in/);
    expect((await page.context().cookies()).some((cookie) => cookie.name.includes('session_token'))).toBe(false);
  });

  test('signing up twice with the same email is refused', async ({ page, browser }) => {
    const email = newEmail();
    await signUp(page, 'Dora Duo', email);

    const guest = await browser.newPage();
    await guest.goto('/sign-up');
    await guest.getByLabel('Name').fill('Dora Copy');
    await guest.getByLabel('Email').fill(email);
    await guest.getByLabel('Password', { exact: true }).fill(PASSWORD);
    await guest.getByLabel('Confirm Password').fill(PASSWORD);
    await guest.getByRole('button', { name: 'Sign Up' }).click();

    await expect(guest.getByText(/already exists/i)).toBeVisible();
    await expect(guest).toHaveURL(/\/sign-up/);
    expect(await prisma.user.count({ where: { email } })).toBe(1);
    await guest.close();
  });

  test('a foreign callbackUrl is ignored after sign-in', async ({ page }) => {
    const email = newEmail();
    await signUp(page, 'Eve Edge', email);
    await signOut(page);

    await page.goto('/sign-in?callbackUrl=https://evil.example/steal');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(PASSWORD);
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page).toHaveURL('/');
  });
});

test.describe('profile', () => {
  test('a new name shows in the header at once', async ({ page }) => {
    await signUp(page, 'Finn Facet', newEmail(), '/user/profile');

    await page.getByPlaceholder('Name').fill('Gala Gem');
    await page.getByRole('button', { name: 'Update Profile' }).click();

    await expect(accountMenu(page)).toHaveText('G');
    await accountMenu(page).click();
    await expect(page.getByText('Gala Gem')).toBeVisible();
  });
});

test.describe('admin and non-admin', () => {
  test('a normal user is kept out of the admin area and sees no admin link', async ({ page }) => {
    await signUp(page, 'Hugo Hoop', newEmail());

    await accountMenu(page).click();
    await expect(page.getByRole('link', { name: t('ADMIN') })).toHaveCount(0);
    await page.keyboard.press('Escape');

    await page.goto('/admin/overview');
    await expect(page).toHaveURL('/admin/unauthorized');
  });

  test('promoting a user to admin opens the admin area at once, demoting closes it', async ({ page }) => {
    const email = newEmail();
    await signUp(page, 'Iris Inlay', email);

    await setRole(email, 'admin');
    await page.goto('/admin/overview');
    await expect(page).toHaveURL('/admin/overview');

    await page.goto('/');
    await accountMenu(page).click();
    await expect(page.getByRole('link', { name: t('ADMIN') })).toBeVisible();
    await page.keyboard.press('Escape');

    await setRole(email, 'user');
    await page.goto('/admin/overview');
    await expect(page).toHaveURL('/admin/unauthorized');
  });

  test('admin pages refuse a normal user and leak no customer data', async ({ page }) => {
    await signUp(page, 'Jade Jewel', newEmail());

    for (const path of ['/admin/users', '/admin/orders', '/admin/products']) {
      await page.goto(path);
      await expect(page).toHaveURL('/admin/unauthorized');
    }
    // Server-rendered HTML must not carry the user list even before the redirect runs.
    const html = await (await page.request.get('/admin/users')).text();
    expect(html).not.toContain('admin@example.com');
  });
});

test.describe('deleted users', () => {
  test('a user deleted while signed in is signed out on the next page', async ({ page }) => {
    const email = newEmail();
    await signUp(page, 'Kai Keeper', email, '/user/profile');
    await expect(page).toHaveURL('/user/profile');

    await prisma.user.delete({ where: { email } });
    expect(await prisma.session.count({ where: { user: { email } } })).toBe(0);

    await page.goto('/user/profile');
    await expect(page).toHaveURL(/\/sign-in/);
    await page.goto('/');
    await expect(signInLink(page)).toBeVisible();
  });

  test('a deleted user cannot sign in again', async ({ page }) => {
    const email = newEmail();
    await signUp(page, 'Lia Loop', email);
    await signOut(page);
    await prisma.user.delete({ where: { email } });

    await page.goto('/sign-in');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(PASSWORD);
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page.getByText('Invalid email or password')).toBeVisible();
  });
});

test.describe('guest cart', () => {
  test('the cart filled as a guest is kept after signing in', async ({ page }) => {
    const email = newEmail();
    await signUp(page, 'Mila Mount', email);
    await signOut(page);

    const name = await openFirstInStockProduct(page);
    await page.getByRole('button', { name: t('ADD_TO_CART') }).click();
    await expect(page.getByRole('link', { name: `${t('NAV_CART')} (1)` })).toBeVisible();

    await signIn(page, email, PASSWORD);
    await page.goto('/cart');

    await expect(page.getByRole('row').filter({ hasText: name })).toBeVisible();
  });
});
