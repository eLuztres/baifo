#!/usr/bin/env node
// Copies the showcase (#324: the `vitrina-` listings, their categories and places) from the local database into a
// separate preview database, e.g. the showcase app's Neon database. Never production: see the guard below.
//   npm run showcase-copy -- --to "<preview DATABASE_URL>"            # dry run: what would be copied
//   npm run showcase-copy -- --to "<preview DATABASE_URL>" --apply    # copy (again): upserts by slug
//   npm run showcase-copy -- --to "<preview DATABASE_URL>" --remove   # delete the vitrina- listings there
// The pictures are committed (public/showcase, public/brand/categories), so the listings keep their /… paths.
import nextEnv from '@next/env';
import { PrismaClient } from '@prisma/client';

nextEnv.loadEnvConfig(process.cwd(), false, { info() {}, error: console.error });

const SLUG_PREFIX = 'vitrina-';
const args = process.argv.slice(2);
const targetUrl = args[args.indexOf('--to') + 1];
const isApply = args.includes('--apply');
const isRemove = args.includes('--remove');

const isLocal = (url) => ['localhost', '127.0.0.1'].includes(new URL(url).hostname);

function fail(message) {
  console.error(message);
  process.exit(1);
}

if (!args.includes('--to') || !targetUrl) fail('Pass the preview database: --to "<DATABASE_URL>"');
if (!isLocal(process.env.DATABASE_URL)) fail('The source must be the local database (DATABASE_URL in .env).');
if (targetUrl === process.env.DATABASE_URL) fail('Source and target are the same database.');

const source = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });
const target = new PrismaClient({ datasourceUrl: targetUrl });

// Production has real listings; a preview database only ever holds the showcase.
async function guardTarget() {
  const realListings = await target.product.count({ where: { NOT: { slug: { startsWith: SLUG_PREFIX } } } });
  if (realListings > 0) fail(`The target has ${realListings} listings that aren't the showcase. Is it production? Stopped.`);
}

async function readShowcase() {
  const products = await source.product.findMany({
    where: { slug: { startsWith: SLUG_PREFIX } },
    include: { categories: { include: { parent: true } }, place: true },
  });
  const categories = new Map();
  for (const category of products.flatMap((product) => product.categories)) {
    if (category.parent) categories.set(category.parent.slug, category.parent);
    categories.set(category.slug, category);
  }
  const places = new Map(products.filter((product) => product.place).map((product) => [product.place.slug, product.place]));
  return { products, categories: [...categories.values()], places: [...places.values()] };
}

async function copyPlace({ id, createdAt, ...place }) {
  await target.place.upsert({ where: { slug: place.slug }, create: place, update: place });
}

// Parents are listed before their subcategories, so they exist by then.
async function copyCategory({ id, createdAt, parentId, parent, ...category }) {
  const parentLink = parent ? { parent: { connect: { slug: parent.slug } } } : {};
  await target.category.upsert({
    where: { slug: category.slug },
    create: { ...category, ...parentLink },
    update: { ...category, ...parentLink },
  });
}

// No seller, buyer or reservation: those rows don't exist in the preview database.
async function copyProduct({ id, categories, place, placeId, sellerId, reservedById, reservedUntil, ...product }) {
  const categorySlugs = categories.map((category) => ({ slug: category.slug }));
  const placeLink = place ? { place: { connect: { slug: place.slug } } } : {};
  await target.product.upsert({
    where: { slug: product.slug },
    create: { ...product, ...placeLink, categories: { connect: categorySlugs } },
    update: { ...product, ...placeLink, categories: { set: categorySlugs } },
  });
}

async function main() {
  await guardTarget();

  if (isRemove) {
    const { count } = await target.product.deleteMany({ where: { slug: { startsWith: SLUG_PREFIX } } });
    console.log(`Removed ${count} showcase listings. Categories and places stay.`);
    return;
  }

  const { products, categories, places } = await readShowcase();
  console.log(`${products.length} listings, ${categories.length} categories, places: ${places.map((place) => place.slug).join(', ')}`);
  if (!isApply) return console.log('Dry run. Add --apply to copy.');

  for (const place of places) await copyPlace(place);
  for (const category of categories) await copyCategory(category);
  for (const product of products) await copyProduct(product);
  console.log('Copied.');
}

main()
  .catch((error) => fail(error.message))
  .finally(() => Promise.all([source.$disconnect(), target.$disconnect()]));
