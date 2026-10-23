#!/usr/bin/env node
// Sets every product in a price class to the class price from PRICE_CLASSES (.env). Run after changing a class price.
//   npm run price-classes            dry run: shows what would change
//   npm run price-classes -- --apply
import nextEnv from '@next/env';
import { PrismaClient } from '@prisma/client';

nextEnv.loadEnvConfig(process.cwd(), false, { info() {}, error: console.error });

const shouldApply = process.argv.includes('--apply');
const classPrices = new Map(
  (process.env.PRICE_CLASSES || '')
    .split(',')
    .map((entry) => entry.split(':').map((part) => part.trim()))
    .filter(([name, price]) => name && price && !Number.isNaN(Number(price)))
    .map(([name, price]) => [name, Number(price).toFixed(2)])
);

const prisma = new PrismaClient();
try {
  const products = await prisma.product.findMany({ where: { priceClass: { not: null } }, orderBy: { name: 'asc' } });
  for (const product of products) {
    const price = classPrices.get(product.priceClass);
    if (!price) {
      console.log(`? ${product.name}: unknown class "${product.priceClass}"`);
    } else if (product.price.toFixed(2) !== price) {
      console.log(`${product.name} (${product.priceClass}): ${product.price.toFixed(2)} → ${price}`);
      if (shouldApply) await prisma.product.update({ where: { id: product.id }, data: { price } });
    }
  }
  console.log(shouldApply ? '✓ Prices applied.' : 'Dry run. Add --apply to write to the database.');
} finally {
  await prisma.$disconnect();
}
