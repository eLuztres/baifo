import { expect, test } from '@playwright/test';
import { t } from './helpers';

test.describe('explore: the list of listings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/explore');
    test.skip((await page.locator('[data-feed-page] ul a').count()) === 0, 'No listings in the database');
  });

  test('search and filters share one line, with no visible title', async ({ page }) => {
    const search = page.getByRole('combobox', { name: t('EXPLORE_SEARCH_LABEL') });
    const typeFilter = page.locator('[data-feed-page] button[aria-haspopup="menu"]').first();
    await expect(page.getByRole('heading', { level: 1 })).toHaveClass(/sr-only/);
    const [fieldBox, filterBox] = await Promise.all([search.boundingBox(), typeFilter.boundingBox()]);
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
    await expect(page).toHaveURL(/\/explore\?tipo=eventos/);
    // A former category is searched by its name, which its etiqueta carries.
    await page.goto('/explore?categoria=hogar');
    await expect(page).toHaveURL(/\/explore\?q=hogar/);
  });

  test('choosing an etiqueta puts its name in the link, and that link opens the same list when shared', async ({ page, browser }) => {
    const search = page.getByRole('combobox', { name: t('EXPLORE_SEARCH_LABEL') });
    await search.click();
    const tagOption = page.locator('[role="option"]').filter({ has: page.locator('svg.lucide-tag') }).first();
    test.skip((await tagOption.count()) === 0, 'No etiquetas in the database');
    const name = (await tagOption.locator('span.truncate').first().textContent())!.trim();
    await tagOption.click();

    // A readable name, not an id.
    await expect(page).toHaveURL(/\/explore\?etiqueta=[a-z0-9-]+$/);
    expect(new URL(page.url()).searchParams.get('etiqueta')).not.toMatch(/^[0-9a-f]{8}-/);
    await expect(search).toHaveValue(name);
    const count = await page.locator('[data-feed-page] ul a').count();
    expect(count).toBeGreaterThan(0);

    // Someone else opens the shared link fresh: the same etiqueta and listings, and its name as the page title.
    const other = await browser.newPage();
    await other.goto(page.url());
    await expect(other.getByRole('combobox', { name: t('EXPLORE_SEARCH_LABEL') })).toHaveValue(name);
    await expect(other.locator('[data-feed-page] ul a')).toHaveCount(count);
    await expect(other).toHaveTitle(new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    await other.close();
  });

  test("a listing's etiqueta badges link to the readable list", async ({ page }) => {
    // Open a listing that has an etiqueta: one from an etiqueta's list.
    await page.getByRole('combobox', { name: t('EXPLORE_SEARCH_LABEL') }).click();
    const tagOption = page.locator('[role="option"]').filter({ has: page.locator('svg.lucide-tag') }).first();
    test.skip((await tagOption.count()) === 0, 'No etiquetas in the database');
    await tagOption.click();
    await expect(page).toHaveURL(/etiqueta=/);
    await page.locator('[data-feed-page] ul a').first().click();
    await page.waitForURL(/\/product\//);
    const badge = page.locator('a[href^="/explore?etiqueta="]').first();
    await expect(badge).toHaveAttribute('href', /^\/explore\?etiqueta=[a-z0-9-]+$/);
    await badge.click();
    await expect(page).toHaveURL(/\/explore\?etiqueta=/);
    await expect(page.locator('[data-feed-page] ul a').first()).toBeVisible();
  });

  test('a price range narrows the list, its count matches, it goes in the link and "All" undoes it', async ({ page }) => {
    const price = page.getByRole('button', { name: t('SEARCH_PRICE') });
    test.skip((await price.count()) === 0, 'The shop shows no prices');
    const all = await page.locator('[data-feed-page] ul a').count();
    await price.click();
    const option = page.getByRole('menuitemcheckbox').nth(1);
    const count = Number(await option.locator('span').last().textContent());
    await option.click();

    await expect(page).toHaveURL(/precio=\d+-\d*/);
    await expect(page.locator('[data-feed-page] ul a')).toHaveCount(count);

    await page.getByRole('button', { name: t('SEARCH_PRICE') }).click();
    await page.getByRole('menuitemcheckbox').first().click();
    await expect(page).not.toHaveURL(/precio=/);
    await expect(page.locator('[data-feed-page] ul a')).toHaveCount(all);
  });

  test('a price range keeps working together with the kind and a shared link', async ({ page, browser }) => {
    await page.goto('/explore?tipo=ofrezco&precio=0-10');
    const count = await page.locator('[data-feed-page] ul a').count();
    const other = await browser.newPage();
    await other.goto('/explore?precio=0-10&tipo=ofrezco');
    await expect(other.locator('[data-feed-page] ul a')).toHaveCount(count);
    await other.close();
    // An unknown range shows everything, as if none was chosen.
    await page.goto('/explore?precio=1-2');
    await expect(page.locator('[data-feed-page] ul a').first()).toBeVisible();
  });
});
