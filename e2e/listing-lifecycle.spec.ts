import fs from 'node:fs';
import path from 'node:path';
import { expect, test, type Browser, type Page } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { parse } from 'dotenv';
import { UTApi } from 'uploadthing/server';
import { uploadthingKey, videoPoster, videoSource } from '@/lib/video';

// A whole listing's life against a local shop: it writes to the database and UploadThing, so it never runs with the rest.
// Run it with `npm run test:lifecycle`. Texts are written in every language, so it needs no AI.
const IS_ENABLED = process.env.E2E_LIFECYCLE === '1';
const ENV = parse(fs.existsSync('.env') ? fs.readFileSync('.env') : '');
const isLocal = (url = '') => /^[a-z]+:\/\/([^@/]*@)?(localhost|127\.0\.0\.1)[:/]/.test(url);

const PHOTO = path.join(process.cwd(), 'public/showcase/vitrina-1-tabla-de-surf-6-2-casi-nueva.jpg');
const EVENT_PHOTO = path.join(process.cwd(), 'public/showcase/vitrina-31-noche-de-jazz-en-la-terraza.jpg');
const LANGUAGES = ['ES', 'EN', 'IT', 'FR', 'DE'];
const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;

test.describe.serial('listing lifecycle', () => {
  test.skip(!IS_ENABLED, 'Writes to the database and UploadThing: run it with npm run test:lifecycle');
  test.setTimeout(10 * MINUTE);
  // A missing button fails in seconds, not at the end of the whole test.
  test.use({ actionTimeout: 30_000 });

  let db: PrismaClient;
  let admin: Page;
  const created: string[] = [];

  test.beforeAll(async ({ browser, baseURL }) => {
    // The dev server compiles each page on its first visit.
    test.setTimeout(5 * MINUTE);
    // Never against baifo.es or a shared database.
    if (!isLocal(ENV.DATABASE_URL) || !isLocal(baseURL)) throw new Error('The lifecycle test only runs against a local shop and database');
    db = new PrismaClient({ datasourceUrl: ENV.DATABASE_URL });
    // The private page allows a few taps per hour; runs one after another would use them up.
    await db.rateLimitHit.deleteMany({ where: { action: { startsWith: 'close-listing' } } });
    await db.rateLimitHit.deleteMany({ where: { action: { startsWith: 'listing-' } } });
    admin = await signedInAdmin(browser);
  });

  test.afterAll(async () => {
    // Whatever a failed run left behind: its rows and its files.
    const leftovers = await db?.submission.findMany({ where: { id: { in: created } }, select: { id: true, productId: true, rawImages: true, images: true, aiImages: true } });
    for (const listing of leftovers ?? []) {
      if (listing.productId) await db.product.deleteMany({ where: { id: listing.productId } });
      await db.submission.delete({ where: { id: listing.id } });
      await deleteFiles([...listing.rawImages, ...listing.images, ...listing.aiImages]);
    }
    await db?.$disconnect();
  });

  test('a product: published, hidden, shown, reminded, expired, back online, sold, deleted', async ({ browser }) => {
    const id = await createListing(admin, { photo: PHOTO, title: 'Prueba E2E tabla de surf' });

    await test.step('goes online with its product, page and place in explore', async () => {
      const listing = await findListing(id);
      expect(listing.status).toBe('LIVE');
      expect(listing.product).not.toBeNull();
      expect(listing.expiresAt!.getTime()).toBeGreaterThan(Date.now() + 30 * DAY);
      expect(listing.product!.expiresAt?.getTime()).toBe(listing.expiresAt!.getTime());
      const visitor = await newVisitor(browser);
      await visitor.goto(`/product/${listing.product!.slug}?lang=es`);
      await expect(visitor.getByRole('heading', { level: 1 })).toHaveText('Prueba E2E tabla de surf ES');
      expect(await isInExplore(visitor, listing.product!.slug)).toBe(true);
      await visitor.close();
    });

    await test.step('the person hides it and shows it again on their private page', async () => {
      const visitor = await openPrivatePage(browser, id);
      await visitor.getByRole('button', { name: 'Ocultar' }).click();
      await expect.poll(async () => (await findListing(id)).status).toBe('HIDDEN');
      expect((await findListing(id)).product).toBeNull();
      await visitor.reload();
      await visitor.getByRole('button', { name: 'Mostrar de nuevo' }).click();
      await expect.poll(async () => (await findListing(id)).status).toBe('LIVE');
      const listing = await findListing(id);
      expect(listing.product).not.toBeNull();
      expect(await isInExplore(visitor, listing.product!.slug)).toBe(true);
      await visitor.close();
    });

    await test.step('the daily run reminds it once when it ends within a week, and it stays online', async () => {
      await setEnd(id, new Date(Date.now() + 3 * DAY));
      const run = await runCron();
      expect(run.reminded).toBeGreaterThanOrEqual(1);
      const listing = await findListing(id);
      expect(listing.status).toBe('LIVE');
      expect(listing.remindedAt).not.toBeNull();
    });

    await test.step('past its end it leaves explore at once, and the daily run expires it', async () => {
      const { product } = await findListing(id);
      await setEnd(id, new Date(Date.now() - MINUTE));
      const visitor = await newVisitor(browser);
      expect(await isInExplore(visitor, product!.slug)).toBe(false);
      const run = await runCron();
      expect(run.expired).toBeGreaterThanOrEqual(1);
      const listing = await findListing(id);
      expect(listing.status).toBe('EXPIRED');
      expect(listing.product).toBeNull();
      // Its pictures and texts stay, so it can come back.
      expect(listing.rawImages).toHaveLength(1);
      // The page shows "not found" (its status stays 200 while the page streams).
      await visitor.goto(`/product/${product!.slug}?lang=es`);
      await expect(visitor.getByText('404', { exact: true })).toBeVisible();
      await expect(visitor.getByRole('heading', { name: 'Prueba E2E tabla de surf ES' })).toHaveCount(0);
      await visitor.close();
    });

    await test.step('the admin puts it back online for a new period', async () => {
      await setStatusInEditor(admin, id, 'LIVE');
      const listing = await findListing(id);
      expect(listing.status).toBe('LIVE');
      expect(listing.expiresAt!.getTime()).toBeGreaterThan(Date.now() + 30 * DAY);
      expect(listing.product?.expiresAt?.getTime()).toBe(listing.expiresAt!.getTime());
    });

    await test.step('the person marks it sold: it leaves the shop', async () => {
      const visitor = await openPrivatePage(browser, id);
      await confirm(visitor, 'Marcar como vendido');
      await expect.poll(async () => (await findListing(id)).status).toBe('SOLD');
      expect((await findListing(id)).product).toBeNull();
      await visitor.close();
      await setStatusInEditor(admin, id, 'LIVE');
      expect((await findListing(id)).status).toBe('LIVE');
    });

    await test.step('the person deletes it: rows and photos are gone', async () => {
      const { rawImages, images, aiImages, product } = await findListing(id);
      const visitor = await openPrivatePage(browser, id);
      await confirm(visitor, 'Borrar');
      await expect.poll(async () => db.submission.count({ where: { id } })).toBe(0);
      expect(await db.product.count({ where: { id: product!.id } })).toBe(0);
      for (const url of [...rawImages, ...images, ...aiImages].filter(Boolean)) {
        await expect.poll(async () => (await fetch(videoSource(url), { method: 'HEAD' })).status, { timeout: 60_000 }).toBe(404);
      }
      await visitor.close();
    });
  });

  test('an event: published, moved to another day, over, finished by the daily run', async ({ browser }) => {
    const id = await createListing(admin, { photo: EVENT_PHOTO, title: 'Prueba E2E evento', type: 'eventos', startsAt: shopDateTime(2 * DAY) });

    await test.step('goes online until the end of its day', async () => {
      const listing = await findListing(id);
      expect(listing.status).toBe('LIVE');
      expect(listing.type).toBe('EVENT');
      expect(listing.expiresAt!.getTime()).toBeGreaterThan(listing.startsAt!.getTime());
      expect(listing.expiresAt!.getTime() - listing.startsAt!.getTime()).toBeLessThanOrEqual(DAY);
      expect(listing.product?.expiresAt?.getTime()).toBe(listing.expiresAt!.getTime());
    });

    await test.step('moved to a later day, it stays online until that day is over', async () => {
      const before = await findListing(id);
      await admin.goto(`/admin/listings/${id}?lang=es`);
      await admin.getByRole('button', { name: '2 Descripción' }).click();
      await admin.locator('#starts-at').fill(shopDateTime(5 * DAY));
      await admin.getByRole('button', { name: 'Guardar', exact: true }).click();
      await expect.poll(async () => (await findListing(id)).startsAt?.getTime()).toBeGreaterThan(before.startsAt!.getTime() + 2 * DAY);
      const listing = await findListing(id);
      expect(listing.expiresAt!.getTime()).toBeGreaterThan(before.expiresAt!.getTime() + 2 * DAY);
      expect(listing.product?.expiresAt?.getTime()).toBe(listing.expiresAt!.getTime());
      const visitor = await newVisitor(browser);
      expect(await isInExplore(visitor, listing.product!.slug)).toBe(true);
      await visitor.close();
    });

    await test.step('once its day is over it leaves explore at once, and the daily run finishes it', async () => {
      const { product } = await findListing(id);
      const yesterday = new Date(Date.now() - 2 * DAY);
      await db.submission.update({ where: { id }, data: { startsAt: yesterday, expiresAt: new Date(yesterday.getTime() + DAY) } });
      await db.product.update({ where: { id: product!.id }, data: { startsAt: yesterday, expiresAt: new Date(yesterday.getTime() + DAY) } });
      const visitor = await newVisitor(browser);
      expect(await isInExplore(visitor, product!.slug)).toBe(false);
      await visitor.close();
      const run = await runCron();
      expect(run.finished).toBeGreaterThanOrEqual(1);
      const listing = await findListing(id);
      expect(listing.status).toBe('FINISHED');
      expect(listing.product).toBeNull();
    });
  });

  // ── Helpers ──

  async function signedInAdmin(browser: Browser) {
    if (!ENV.LOCAL_TEST_ADMIN_EMAIL || !ENV.LOCAL_TEST_ADMIN_PASSWORD) throw new Error('Set LOCAL_TEST_ADMIN_EMAIL and LOCAL_TEST_ADMIN_PASSWORD in .env');
    const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
    await page.goto('/sign-in');
    // The page puts its language in the address once loaded, which would empty a form filled before.
    await page.waitForLoadState('networkidle');
    await page.locator('input[name=email]').fill(ENV.LOCAL_TEST_ADMIN_EMAIL);
    await page.locator('input[name=password]').fill(ENV.LOCAL_TEST_ADMIN_PASSWORD);
    await page.getByRole('button', { name: /^(Iniciar sesión|Sign In|Entrar)$/i }).click();
    await page.waitForURL((url) => !url.pathname.startsWith('/sign-in'));
    return page;
  }

  async function newVisitor(browser: Browser) {
    return (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  }

  interface NewListing {
    photo: string;
    title: string;
    /** The listing type's link name (LISTING_TYPE_PARAMS); none: a product. */
    type?: string;
    /** An event's start, as the date field takes it. */
    startsAt?: string;
  }

  /** Through the admin editor, like the admin does it: photo, texts in every language, price, an email contact and the person's OK. */
  async function createListing(page: Page, { photo, title, type, startsAt }: NewListing) {
    await page.goto(`/admin/listings/new?lang=es${type ? `&tipo=${type}` : ''}`);
    await page.waitForURL(/anuncio=/);
    const id = new URL(page.url()).searchParams.get('anuncio')!;
    // Known from here on, so even a run that fails halfway cleans it up.
    created.push(id);
    await page.locator('input[type=file]').setInputFiles(photo);
    await expect.poll(async () => (await findListing(id)).rawImages.length, { timeout: 120_000 }).toBe(1);

    await page.getByRole('button', { name: '2 Descripción' }).click();
    for (const language of LANGUAGES) {
      await page.getByRole('tab', { name: language }).click();
      await page.getByRole('textbox', { name: 'Título' }).fill(`${title} ${language}`);
      await page.getByRole('textbox', { name: 'Descripción' }).fill(`${title} (${language}): un anuncio de prueba del test de extremo a extremo. Se borra solo.`);
    }
    await page.getByRole('tab', { name: 'ES' }).click();
    if (startsAt) await page.locator('#starts-at').fill(startsAt);
    // An event's price is its ticket.
    await page.getByRole('textbox', { name: /^(Importe|Entrada)/ }).fill('12');

    // An email that can never reach anyone, instead of a WhatsApp number: no message goes to a real person.
    await page.getByRole('button', { name: '3 Contacto' }).click();
    await page.getByRole('button', { name: 'WhatsApp' }).click();
    await page.getByRole('menuitemcheckbox', { name: 'Email' }).click();
    if (!(await page.getByRole('menu').isVisible())) await page.getByRole('button', { name: /WhatsApp/ }).click();
    await page.getByRole('menuitemcheckbox', { name: 'WhatsApp' }).click();
    await page.keyboard.press('Escape');
    await page.getByRole('textbox', { name: 'Email' }).fill('e2e-test@example.com');
    await page.getByRole('textbox', { name: 'Nombre (opcional)' }).fill('Prueba E2E');
    await page.getByRole('checkbox', { name: /solicita publicar su número/ }).check();

    await page.getByRole('button', { name: 'Publicar' }).click();
    await page.waitForURL(/\/product\//, { timeout: 180_000 });
    return id;
  }

  /** The admin editor's Estado on "4 Más", saved. */
  async function setStatusInEditor(page: Page, id: string, status: string) {
    await page.goto(`/admin/listings/${id}?lang=es`);
    await page.getByRole('button', { name: '4 Más' }).click();
    await page.locator('#listing-state').selectOption(status);
    await page.getByRole('button', { name: 'Guardar', exact: true }).click();
    await expect.poll(async () => (await findListing(id)).status).toBe(status);
  }

  async function openPrivatePage(browser: Browser, id: string) {
    const { payToken } = await findListing(id);
    const page = await newVisitor(browser);
    await page.goto(`/publicar/${payToken}?lang=es`);
    return page;
  }

  /** A private-page button that asks first, confirmed. */
  async function confirm(page: Page, label: string) {
    await page.getByRole('button', { name: label }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: label }).click();
  }

  async function findListing(id: string) {
    return db.submission.findUniqueOrThrow({ where: { id }, include: { product: true } });
  }

  /** Moves a live listing's end, on the listing and its product alike, as the app keeps them. */
  async function setEnd(id: string, end: Date) {
    const { productId } = await findListing(id);
    await db.submission.update({ where: { id }, data: { expiresAt: end, remindedAt: null } });
    if (productId) await db.product.update({ where: { id: productId }, data: { expiresAt: end } });
  }

  async function isInExplore(page: Page, slug: string) {
    await page.goto('/explore?lang=es');
    return (await page.locator(`a[href^="/product/${slug}"]`).count()) > 0;
  }

  /** The daily cron, as Vercel calls it. Every local listing takes part, not only the test's. */
  async function runCron() {
    const response = await admin.request.get('/api/cron/marketplace', { headers: { authorization: `Bearer ${ENV.CRON_SECRET}` } });
    expect(response.status()).toBe(200);
    return (await response.json()) as { retried: number; finished: number; expired: number; unpaid: number; reminded: number };
  }

  async function deleteFiles(urls: string[]) {
    const keys = urls.flatMap((url) => [videoSource(url), videoPoster(url)]).flatMap((file) => (file && uploadthingKey(file)) || []);
    if (keys.length > 0 && ENV.UPLOADTHING_TOKEN) await new UTApi({ token: ENV.UPLOADTHING_TOKEN }).deleteFiles(keys).catch(() => undefined);
  }
});

/** A date and time `fromNow` ahead, as a datetime-local field takes it (shop time is close enough for whole days). */
function shopDateTime(fromNow: number) {
  const date = new Date(Date.now() + fromNow);
  return `${date.toISOString().slice(0, 10)}T19:00`;
}
