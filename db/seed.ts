import { PrismaClient } from '@prisma/client';
import sampleData from './sample-data';
import { hash } from '@/lib/encrypt';

async function main() {
  const prisma = new PrismaClient();
  await prisma.product.deleteMany();
  await prisma.account.deleteMany();
  await prisma.session.deleteMany();
  await prisma.verification.deleteMany();
  await prisma.user.deleteMany();

  await prisma.product.createMany({ data: sampleData.products });
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
