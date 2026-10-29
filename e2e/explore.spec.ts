import { expect, test, type Page } from '@playwright/test';
import { t } from './helpers';

const ring = (page: Page) => page.getByRole('navigation', { name: t('EXPLORE_CATEGORY_BUTTON') });
const chosenName = async (page: Page) => (await ring(page).locator('[aria-current="page"]').getAttribute('aria-label')) ?? '';

test.describe('explore: category ring and rows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/explore');
    test.skip((await page.locator('[data-feed-page] section').count()) === 0, 'No listings in the database');
  });

  test('starts straight with the ring, no visible title and no counts', async ({ page }) => {
    await expect(ring(page)).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toHaveClass(/sr-only/);
    expect(await chosenName(page)).toBe(t('EXPLORE_ALL'));
    // No "15 listings" anywhere: numbers make no sense on this page.
    await expect(page.locator('[data-feed-page]')).not.toContainText(/\d+ (listings|products)/);
  });

  test('the arrows turn the ring and open the next choice, the way back returns to everything', async ({ page }) => {
    await ring(page).getByRole('button', { name: t('EXPLORE_NEXT') }).click();
    await expect(page).toHaveURL(/\/explore\?(hoy|pronto|tipo=|c=)/);
    const name = await chosenName(page);
    await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
    await expect(page.locator('[data-feed-page] header')).not.toContainText(/\d/);

    await ring(page).getByRole('button', { name: t('EXPLORE_PREVIOUS') }).click();
    await expect(page).toHaveURL(/\/explore$/);

    await ring(page).getByRole('button', { name: t('EXPLORE_NEXT') }).click();
    await expect(page).not.toHaveURL(/\/explore$/);
    await page.locator('[data-feed-page] header a[href="/explore"]').click();
    await expect(page).toHaveURL(/\/explore$/);
  });

  test('swiping the ring opens the choice that lands in the middle', async ({ page }) => {
    const track = ring(page).locator('a').first().locator('..');
    const step = await ring(page).locator('a').first().evaluate((link) => (link as HTMLElement).offsetWidth);
    await track.evaluate((element, left) => element.scrollBy({ left, behavior: 'smooth' }), step);

    await expect(page).not.toHaveURL(/\/explore$/);
    expect(await chosenName(page)).not.toBe(t('EXPLORE_ALL'));
  });

  test('"See all" on a row opens that whole category', async ({ page }) => {
    const row = page.locator('[data-feed-page] section').first();
    const title = (await row.getByRole('heading', { level: 2 }).first().textContent())!.trim();
    await row.getByRole('link', { name: t('EXPLORE_SEE_ALL') }).click();

    await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
    expect(await chosenName(page)).toBe(title);
  });
});
