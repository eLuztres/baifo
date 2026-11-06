#!/usr/bin/env node
// Copies the showcase (#324: the `vitrina-` listings and their places) from the local database into a
// separate preview database, e.g. the showcase app's Neon database. Never production: see the guard below.
//   npm run showcase-copy -- --to "<preview DATABASE_URL>"            # dry run: what would be copied
//   npm run showcase-copy -- --to "<preview DATABASE_URL>" --apply    # copy (again): upserts by slug
//   npm run showcase-copy -- --to "<preview DATABASE_URL>" --remove   # delete the vitrina- listings there
// The pictures are committed (public/showcase), so the listings keep their /… paths.
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
    include: { place: true },
  });
  const places = new Map(products.filter((product) => product.place).map((product) => [product.place.slug, product.place]));
  return { products, places: [...places.values()] };
}

async function copyPlace({ id, createdAt, ...place }) {
  await target.place.upsert({ where: { slug: place.slug }, create: place, update: place });
}

// No seller, buyer or reservation: those rows don't exist in the preview database.
async function copyProduct({ id, place, placeId, sellerId, reservedById, reservedUntil, ...product }) {
  const placeLink = place ? { place: { connect: { slug: place.slug } } } : {};
  await target.product.upsert({
    where: { slug: product.slug },
    create: { ...product, ...placeLink },
    update: { ...product, ...placeLink },
  });
}

async function main() {
  await guardTarget();

  if (isRemove) {
    const { count } = await target.product.deleteMany({ where: { slug: { startsWith: SLUG_PREFIX } } });
    console.log(`Removed ${count} showcase listings. Places stay.`);
    return;
  }

  const { products, places } = await readShowcase();
  console.log(`${products.length} listings, places: ${places.map((place) => place.slug).join(', ')}`);
  if (!isApply) return console.log('Dry run. Add --apply to copy.');

  for (const place of places) await copyPlace(place);
  for (const product of products) await copyProduct(product);
  console.log('Copied.');
}

main()
  .catch((error) => fail(error.message))
  .finally(() => Promise.all([source.$disconnect(), target.$disconnect()]));
