import { expect, test } from '@playwright/test';
import { t } from './helpers';

test.describe('explore: the list of listings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/explore');
    test.skip((await page.locator('[data-feed-page] ul a').count()) === 0, 'No listings in the database');
  });

  test('search and filters share one line, with no visible title', async ({ page }) => {
    const search = page.getByRole('combobox', { name: t('EXPLORE_SEARCH_LABEL') });
    const category = page.getByRole('button', { name: t('SEARCH_CATEGORY') });
    await expect(page.getByRole('heading', { level: 1 })).toHaveClass(/sr-only/);
    const [fieldBox, filterBox] = await Promise.all([search.boundingBox(), category.boundingBox()]);
    expect(Math.abs(fieldBox!.y - filterBox!.y)).toBeLessThan(8);
  });

  test('searching narrows the list and clearing brings everything back', async ({ page }) => {
    const all = await page.locator('[data-feed-page] ul a').count();
    const search = page.getByRole('combobox', { name: t('EXPLORE_SEARCH_LABEL') });
    await search.fill('zzzznothinglikethis');
    await search.press('Enter');
    await expect(page).toHaveURL(/q=zzzznothinglikethis/);
    await expect(page.locator('[data-feed-page] ul a')).toHaveCount(0);

    await page.getByRole('button', { name: t('EXPLORE_SEARCH_CLEAR') }).click();
    await expect(page).toHaveURL(/\/explore$/);
    await expect(page.locator('[data-feed-page] ul a')).toHaveCount(all);
  });

  test('older category links keep working', async ({ page }) => {
    await page.goto('/explore?c=eventos');
    await expect(page).toHaveURL(/\/explore\?(tipo|categoria)=eventos/);
  });
});
