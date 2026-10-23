import { prisma } from '@/db/prisma';

/** The seller sold their newest live listing: it leaves the shop. */
export async function markSold(sellerId: string) {
  const submission = await prisma.submission.findFirst({
    where: { sellerId, status: 'LIVE' },
    orderBy: { paidAt: 'desc' },
  });
  if (!submission) return false;
  await prisma.$transaction([
    prisma.submission.update({ where: { id: submission.id }, data: { status: 'SOLD' } }),
    ...(submission.productId ? [prisma.product.update({ where: { id: submission.productId }, data: { stock: 0, expiresAt: new Date() } })] : []),
  ]);
  return true;
}
