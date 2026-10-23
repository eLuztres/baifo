import { PrismaClient } from '@prisma/client';
import sampleData from './sample-data';
import { hash } from '@/lib/encrypt';
import slugify from 'slugify';

async function main() {
  const prisma = new PrismaClient();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.account.deleteMany();
  await prisma.session.deleteMany();
  await prisma.verification.deleteMany();
  await prisma.user.deleteMany();

  // One store category per sample category, with its products in it.
  const categoryNames = [...new Set(sampleData.products.map((product) => product.category))];
  for (const [sortOrder, name] of categoryNames.entries()) {
    await prisma.category.create({
      data: {
        slug: slugify(name, { lower: true, strict: true }),
        name: { en: name },
        text: {},
        scene: '',
        sortOrder,
        products: { create: sampleData.products.filter((product) => product.category === name) },
      },
    });
  }
  // Better Auth keeps passwords on a "credential" account, not on the user.
  for (const { password, ...user } of sampleData.users) {
    const created = await prisma.user.create({ data: user });
    await prisma.account.create({
      data: { userId: created.id, accountId: created.id, providerId: 'credential', password: await hash(password) },
    });
  }

  console.log('Database seeded successfully!');
}

main();
