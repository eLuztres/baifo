#!/usr/bin/env node
// Screenshots every Baifo view on desktop and phone into one numbered web page, for feedback per number.
//   npm run ui-gallery                  (dev server on http://localhost:3000)
//   UI_GALLERY_URL=http://localhost:3100 UI_GALLERY_DIR=/tmp/gallery npm run ui-gallery
// Admin views sign in through the sign-in form as LOCAL_TEST_ADMIN_EMAIL / LOCAL_TEST_ADMIN_PASSWORD from .env.
// Only reads: it adds nothing to a cart and sends no form besides the sign-in.
import { mkdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import nextEnv from '@next/env';
import { PrismaClient } from '@prisma/client';
import { chromium } from '@playwright/test';

nextEnv.loadEnvConfig(process.cwd(), false, { info() {}, error: console.error });

const BASE_URL = (process.env.UI_GALLERY_URL || 'http://localhost:3000').replace(/\/$/, '');
const OUT_DIR = process.env.UI_GALLERY_DIR || path.join(os.homedir(), 'Videos/changes/card-380-ui-gallery');
const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  phone: { width: 375, height: 812 },
};

// Numbers are fixed so feedback stays valid between runs: a new view gets the next free number.
const VIEWS = [
  { number: 1, group: 'Shop', title: 'Home', path: '/' },
  { number: 2, group: 'Shop', title: 'Store', path: '/store' },
  { number: 3, group: 'Shop', title: 'Explore', path: '/explore' },
  { number: 4, group: 'Shop', title: 'Search', path: '/search' },
  { number: 5, group: 'Shop', title: 'Offers', path: '/ofertas' },
  { number: 6, group: 'Shop', title: 'Category', path: (ids) => ids.categorySlug && `/category/${ids.categorySlug}` },
  { number: 7, group: 'Shop', title: 'Product', path: (ids) => ids.productSlug && `/product/${ids.productSlug}` },
  { number: 8, group: 'Shop', title: 'Corral', path: (ids) => ids.corralSlug && `/corral/${ids.corralSlug}` },
  { number: 9, group: 'Shop', title: 'Private listing link', path: (ids) => ids.payToken && `/publicar/${ids.payToken}` },
  { number: 10, group: 'Shop', title: 'Cart', path: '/cart' },
  { number: 11, group: 'Shop', title: 'Contact', path: '/contact' },
  { number: 12, group: 'Shop', title: 'Impressum', path: '/impressum' },
  { number: 13, group: 'Shop', title: 'Privacy', path: '/privacy' },
  { number: 14, group: 'Shop', title: 'Sign in', path: '/sign-in' },
  { number: 15, group: 'Shop', title: 'Sign up', path: '/sign-up' },
  { number: 16, group: 'Account', title: 'Profile', path: '/user/profile', isAdmin: true },
  { number: 17, group: 'Account', title: 'My orders', path: '/user/orders', isAdmin: true },
  { number: 18, group: 'Account', title: 'Order', path: (ids) => ids.orderId && `/order/${ids.orderId}`, isAdmin: true },
  { number: 19, group: 'Account', title: 'Shipping address', path: '/shipping-address', isAdmin: true },
  { number: 20, group: 'Account', title: 'Payment method', path: '/payment-method', isAdmin: true },
  { number: 21, group: 'Account', title: 'Place order', path: '/place-order', isAdmin: true },
  { number: 22, group: 'Admin', title: 'Overview', path: '/admin/overview', isAdmin: true },
  { number: 23, group: 'Admin', title: 'Products', path: '/admin/products', isAdmin: true },
  { number: 24, group: 'Admin', title: 'New product', path: '/admin/products/create', isAdmin: true },
  { number: 25, group: 'Admin', title: 'Edit product', path: (ids) => ids.productId && `/admin/products/${ids.productId}`, isAdmin: true },
  { number: 26, group: 'Admin', title: 'Product studio', path: '/admin/studio', isAdmin: true },
  { number: 27, group: 'Admin', title: 'Orders', path: '/admin/orders', isAdmin: true },
  { number: 28, group: 'Admin', title: 'Users', path: '/admin/users', isAdmin: true },
  { number: 29, group: 'Admin', title: 'Edit user', path: (ids) => ids.userId && `/admin/users/${ids.userId}`, isAdmin: true },
  { number: 30, group: 'Admin', title: 'Listings', path: '/admin/listings', isAdmin: true },
  { number: 31, group: 'Admin', title: 'New listing', path: '/admin/listings/new', isAdmin: true },
  { number: 32, group: 'Admin', title: 'Listing', path: (ids) => ids.listingId && `/admin/listings/${ids.listingId}`, isAdmin: true },
  { number: 33, group: 'Admin', title: 'Offers', path: '/admin/offers', isAdmin: true },
  { number: 35, group: 'Admin', title: 'Places', path: '/admin/places', isAdmin: true },
  { number: 36, group: 'Admin', title: 'AI costs', path: '/admin/ai-costs', isAdmin: true },
  { number: 37, group: 'Admin', title: 'Unauthorized', path: '/admin/unauthorized', isAdmin: true },
  ...listingEditorViews(),
];

/** Per listing type: the empty new-listing form, a live listing's editor, and how that listing looks in the shop. */
function listingEditorViews() {
  const types = [
    { type: 'PRODUCT', label: 'Product', param: 'productos' },
    { type: 'WANTED', label: 'Looking for', param: 'busco' },
    { type: 'SERVICE', label: 'Service', param: 'servicios' },
    { type: 'EVENT', label: 'Event', param: 'eventos' },
  ];
  return types.flatMap(({ type, label, param }, index) => {
    const number = 38 + index * 3;
    const group = 'Listing editors';
    return [
      { number, group, title: `${label}: new listing form`, path: `/admin/listings/new?tipo=${param}`, isAdmin: true },
      { number: number + 1, group, title: `${label}: editor`, path: (ids) => ids.liveListings[type]?.id && `/admin/listings/${ids.liveListings[type].id}`, isAdmin: true },
      { number: number + 2, group, title: `${label}: result in the shop`, path: (ids) => ids.liveListings[type]?.product && `/product/${ids.liveListings[type].product.slug}` },
    ];
  });
}

/** Real ids for the [dynamic] routes, read from the database. */
async function loadIds(adminEmail) {
  const prisma = new PrismaClient();
  try {
    const admin = await prisma.user.findFirst({ where: { email: { equals: adminEmail, mode: 'insensitive' } }, select: { id: true } });
    const [product, category, corral, liveListing, listing, order] = await Promise.all([
      prisma.product.findFirst({ orderBy: { createdAt: 'desc' }, select: { id: true, slug: true } }),
      prisma.category.findFirst({ select: { slug: true } }),
      prisma.corral.findFirst({ select: { place: { select: { slug: true } } } }),
      prisma.submission.findFirst({ where: { status: 'LIVE' }, orderBy: { createdAt: 'desc' }, select: { payToken: true } }),
      prisma.submission.findFirst({ orderBy: { createdAt: 'desc' }, select: { id: true } }),
      prisma.order.findFirst({ where: admin ? { userId: admin.id } : {}, orderBy: { createdAt: 'desc' }, select: { id: true } }),
    ]);
    const liveListings = Object.fromEntries(await Promise.all(['PRODUCT', 'WANTED', 'SERVICE', 'EVENT'].map(async (type) => [
      type,
      await prisma.submission.findFirst({
        where: { type, status: 'LIVE', productId: { not: null } },
        orderBy: { createdAt: 'desc' },
        select: { id: true, product: { select: { slug: true } } },
      }),
    ])));
    return {
      liveListings,
      productId: product?.id,
      productSlug: product?.slug,
      categorySlug: category?.slug,
      corralSlug: corral?.place.slug,
      payToken: liveListing?.payToken,
      listingId: listing?.id,
      orderId: order?.id,
      userId: admin?.id,
    };
  } finally {
    await prisma.$disconnect();
  }
}

async function signIn(page, email, password) {
  await page.goto(`${BASE_URL}/sign-in`, { waitUntil: 'networkidle' });
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.locator('form:has(#email) button').click();
  await page.waitForURL((url) => !url.pathname.startsWith('/sign-in'), { timeout: 30_000 });
}

/** Scrolls to the bottom and back so lazy pictures and scroll animations are in the shot. */
async function revealWholePage(page) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += window.innerHeight / 2) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 120));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
  await page.waitForTimeout(500);
}

async function shoot(context, view, viewPath, device) {
  const page = await context.newPage();
  try {
    const response = await page.goto(`${BASE_URL}${viewPath}`, { waitUntil: 'load', timeout: 120_000 });
    // Some views redirect on the client right after loading; shoot where they land.
    await revealWholePage(page).catch(async () => {
      await page.waitForLoadState('load');
      await revealWholePage(page);
    });
    const file = `${String(view.number).padStart(2, '0')}-${device}.png`;
    await page.screenshot({ path: path.join(OUT_DIR, file), fullPage: true });
    const landedOn = new URL(page.url()).pathname;
    return { file, landedOn: landedOn === new URL(viewPath, BASE_URL).pathname ? null : landedOn, status: response?.status() };
  } catch (error) {
    console.error(`  #${view.number} ${device}: ${error.message.split('\n')[0]}`);
    return { file: null, error: 'Could not load' };
  } finally {
    await page.close();
  }
}

const escapeHtml = (text) => String(text).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

function shotHtml(device, shot) {
  if (!shot?.file) return `<figure class="missing"><figcaption>${device}</figcaption><p>${escapeHtml(shot?.error ?? 'No data')}</p></figure>`;
  // A redirect shows another view's page again, so name it instead of repeating the picture.
  if (shot.landedOn) return `<figure class="missing"><figcaption>${device}</figcaption><p>Redirects to <code>${escapeHtml(shot.landedOn)}</code></p></figure>`;
  const note = [shot.landedOn && `went to ${shot.landedOn}`, shot.status >= 400 && `HTTP ${shot.status}`].filter(Boolean).join(', ');
  return `<figure class="${device}"><figcaption>${device}${note ? ` <em>(${escapeHtml(note)})</em>` : ''}</figcaption>
    <a href="${shot.file}" target="_blank"><img src="${shot.file}" alt="#${shot.number} ${device}" loading="lazy"></a></figure>`;
}

function galleryHtml(results, takenAt) {
  const groups = [...new Set(results.map((r) => r.view.group))];
  const contents = groups
    .map((group) => `<li><b>${group}</b> ${results.filter((r) => r.view.group === group)
      .map((r) => `<a href="#v${r.view.number}">${r.view.number} ${escapeHtml(r.view.title)}</a>`).join(' · ')}</li>`)
    .join('');
  const sections = results
    .map(({ view, viewPath, shots }) => `<section id="v${view.number}">
    <h2><span class="number">#${view.number}</span> ${escapeHtml(view.title)} <code>${escapeHtml(viewPath ?? 'no data in the database')}</code></h2>
    <div class="shots">${shotHtml('desktop', shots.desktop)}${shotHtml('phone', shots.phone)}</div></section>`)
    .join('\n');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Baifo UI gallery</title><style>
  body { font-family: system-ui, sans-serif; margin: 0; padding: 1rem; background: #f4f4f5; color: #18181b; }
  header { position: sticky; top: 0; background: #f4f4f5; padding-bottom: .5rem; z-index: 1; border-bottom: 1px solid #d4d4d8; }
  h1 { margin: 0 0 .25rem; font-size: 1.4rem; }
  header p { margin: 0 0 .5rem; color: #52525b; font-size: .9rem; }
  header ul { margin: 0; padding: 0; list-style: none; font-size: .85rem; line-height: 1.7; }
  header a { color: inherit; white-space: nowrap; }
  section { background: #fff; border-radius: .75rem; margin: 1.5rem 0; padding: 1rem; scroll-margin-top: 12rem; }
  h2 { margin: 0 0 .75rem; font-size: 1.1rem; display: flex; flex-wrap: wrap; gap: .5rem; align-items: baseline; }
  .number { background: #18181b; color: #fff; border-radius: .4rem; padding: 0 .5rem; }
  code { font-size: .8rem; color: #52525b; overflow-wrap: anywhere; }
  .shots { display: flex; gap: 1rem; align-items: flex-start; }
  figure { margin: 0; }
  figure.desktop { flex: 3; min-width: 0; }
  figure.phone { flex: 1; min-width: 0; max-width: 375px; }
  figure.missing { flex: 1; color: #71717a; }
  figcaption { font-size: .8rem; color: #52525b; margin-bottom: .25rem; }
  img { width: 100%; max-height: 1600px; object-fit: cover; object-position: top; border: 1px solid #e4e4e7; border-radius: .4rem; display: block; }
  @media (max-width: 700px) { header { position: static; } section { scroll-margin-top: 1rem; } .shots { flex-direction: column; } figure.phone { max-width: none; } }
</style></head><body>
<header><h1>Baifo UI gallery</h1><p>${results.length} views, desktop ${VIEWPORTS.desktop.width}px and phone ${VIEWPORTS.phone.width}px, taken ${escapeHtml(takenAt)}. Click a picture for the full page.</p>
<ul>${contents}</ul></header>
${sections}
</body></html>`;
}

async function main() {
  const adminEmail = process.env.LOCAL_TEST_ADMIN_EMAIL;
  const adminPassword = process.env.LOCAL_TEST_ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) {
    console.error('Set LOCAL_TEST_ADMIN_EMAIL and LOCAL_TEST_ADMIN_PASSWORD in .env for the admin views.');
    process.exit(1);
  }
  mkdirSync(OUT_DIR, { recursive: true });
  const ids = await loadIds(adminEmail);
  const browser = await chromium.launch({ executablePath: process.env.E2E_CHROMIUM_PATH || undefined });
  const results = VIEWS.map((view) => ({ view, viewPath: typeof view.path === 'function' ? view.path(ids) || null : view.path, shots: {} }));

  try {
    for (const [device, viewport] of Object.entries(VIEWPORTS)) {
      const isMobile = device === 'phone';
      const options = { viewport, deviceScaleFactor: isMobile ? 2 : 1, isMobile, hasTouch: isMobile };
      const guest = await browser.newContext(options);
      const admin = await browser.newContext(options);
      const signInPage = await admin.newPage();
      await signIn(signInPage, adminEmail, adminPassword);
      await signInPage.close();

      for (const result of results) {
        const { view, viewPath } = result;
        if (!viewPath) continue;
        console.log(`#${view.number} ${view.title} (${device})`);
        result.shots[device] = { ...(await shoot(view.isAdmin ? admin : guest, view, viewPath, device)), number: view.number };
      }
      await guest.close();
      await admin.close();
    }
  } finally {
    await browser.close();
  }

  const indexFile = path.join(OUT_DIR, 'index.html');
  writeFileSync(indexFile, galleryHtml(results, new Date().toLocaleString('en-GB')));
  console.log(`\n✓ Gallery: file://${indexFile}`);
}

await main();
