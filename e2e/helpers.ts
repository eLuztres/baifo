import { test, type Page } from '@playwright/test';
import { createTranslator, getDictionary, type Locale } from '@/lib/i18n';

// Labels come from the shop's dictionary (brand/messages included), never hardcoded
export const tIn = (locale: Locale) => createTranslator(getDictionary(locale));
export const t = tIn('en');

// These specs create users, so they only run against a
// throwaway database: E2E_ALLOW_WRITES=1 npm run test:e2e
export const ALLOWS_WRITES = process.env.E2E_ALLOW_WRITES === '1';

export function skipUnlessWritesAllowed() {
  test.skip(!ALLOWS_WRITES, 'Set E2E_ALLOW_WRITES=1 (test database only) to run');
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
