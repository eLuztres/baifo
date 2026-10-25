import { PrismaClient } from '@prisma/client';

// One-off: copies chosen local listings (product, its submission, the seller) to the production database.
// Run: PROD_DATABASE_URL='postgresql://…' npx tsx scripts/copy-listings.ts
const SLUGS = ['bicicleta-de-paseo-para-hombre-0e8b93', 'reloj-apple-watch-ultra-b233da', 'bicicleta-de-paseo-turquesa-280483'];

if (!process.env.PROD_DATABASE_URL) throw new Error('Set PROD_DATABASE_URL to the production database URL');
const local = new PrismaClient();
const prod = new PrismaClient({ datasourceUrl: process.env.PROD_DATABASE_URL });

(async () => {
  for (const slug of SLUGS) {
    const found = await local.product.findUnique({ where: { slug }, include: { seller: true, submission: true, categories: { select: { slug: true } } } });
    if (!found) {
      console.log('not in the local database:', slug);
      continue;
    }
    const { seller, submission, categories, ...product } = found;
    // The store's categories are a link table, so they're connected by slug (the same categories exist in both databases).
    const categoryLinks = { set: categories.map((category) => ({ slug: category.slug })) };
    if (await prod.product.findUnique({ where: { slug } })) {
      await prod.product.update({ where: { slug }, data: { categories: categoryLinks } });
      console.log('already online, categories set:', found.name, categories.map((category) => category.slug).join(', '));
      continue;
    }
    const prodSeller = seller && (await prod.seller.upsert({ where: { waId: seller.waId }, update: {}, create: { waId: seller.waId, name: seller.name } }));
    await prod.product.create({ data: { ...product, sellerId: prodSeller?.id ?? null, categories: { connect: categoryLinks.set } } });
    if (submission && prodSeller) await prod.submission.create({ data: { ...submission, sellerId: prodSeller.id } });
    console.log('copied:', found.name);
  }
  console.log('listings in production:', await prod.product.count({ where: { sellerId: { not: null } } }));
})().finally(() => Promise.all([local.$disconnect(), prod.$disconnect()]));
