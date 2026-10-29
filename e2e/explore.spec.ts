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

  test('the arrows turn the ring and open the next choice, the round back button returns to everything', async ({ page }) => {
    await ring(page).getByRole('button', { name: t('EXPLORE_NEXT') }).click();
    await expect(page).toHaveURL(/\/explore\?(hoy|pronto|tipo=|c=)/);
    const name = await chosenName(page);
    // The name shows once, under the ring; the page title is only for screen readers.
    await expect(page.getByRole('heading', { level: 1, name })).toHaveClass(/sr-only/);
    await expect(page.locator('[data-feed-page]').getByText(name, { exact: true }).and(page.locator(':not(.sr-only)'))).toHaveCount(1);

    // On a choice the ring holds only the choices; "everything" is the back button.
    await expect(ring(page).getByRole('link', { name: t('EXPLORE_ALL') })).toHaveCount(1);
    await ring(page).getByRole('link', { name: t('EXPLORE_ALL') }).click();
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

    await expect(page.getByRole('heading', { level: 1, name: title })).toHaveCount(1);
    expect(await chosenName(page)).toBe(title);
  });
});
