import { test, type Page } from '@playwright/test';
import { createTranslator, getDictionary, type Locale } from '@/lib/i18n';

// Labels come from the shop's dictionary (brand/messages included), never hardcoded
export const tIn = (locale: Locale) => createTranslator(getDictionary(locale));
export const t = tIn('en');

// These specs create carts, users and orders, so they only run against a
// throwaway database: E2E_ALLOW_WRITES=1 npm run test:e2e
export const ALLOWS_WRITES = process.env.E2E_ALLOW_WRITES === '1';

export function skipUnlessWritesAllowed() {
  test.skip(!ALLOWS_WRITES, 'Set E2E_ALLOW_WRITES=1 (test database only) to run');
}

/** Opens the first in-stock product from the shop, or skips when there is none. */
export async function openFirstInStockProduct(page: Page) {
  await page.goto('/store');
  const addButtons = page.getByRole('button', { name: t('ADD_TO_CART') });
  const hasProduct = (await addButtons.count()) > 0;
  test.skip(!hasProduct, 'No in-stock products in the database');

  const card = page.locator('article').filter({ has: addButtons.first() }).first();
  const name = (await card.getByRole('heading').textContent())?.trim() ?? '';
  await card.getByRole('heading').click();
  await page.waitForURL(/\/product\//);
  return name;
}

/** Locale codes the shop offers besides English, read from the language switcher. */
export async function otherEnabledLocales(page: Page, switcherItems: string) {
  const codes = await page.locator(switcherItems).evaluateAll((items) =>
    items.map((item) => item.getAttribute('lang'))
  );
  return codes.filter((code): code is Locale => !!code && code !== 'en');
}

export async function signIn(page: Page, email: string, password: string) {
  await page.goto('/sign-in');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/sign-in'));
}
