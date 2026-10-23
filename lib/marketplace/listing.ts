import { prisma } from '@/db/prisma';
import { takeDown } from './publish';

/** The seller sold their newest live listing: it leaves the shop. */
export async function markSold(sellerId: string) {
  const submission = await prisma.submission.findFirst({
    where: { sellerId, status: 'LIVE' },
    orderBy: { paidAt: 'desc' },
  });
  if (!submission) return false;
  await takeDown(submission.id, 'SOLD');
  return true;
}
