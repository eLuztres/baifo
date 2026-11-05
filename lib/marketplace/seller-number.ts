import { prisma } from '@/db/prisma';

interface ListingToMove {
  id: string;
  productId: string | null;
  hasContactConsent: boolean;
}

/** Buyers write to the new number and it closes the listing from now on: the seller's own change and the admin's.
    Without a number (the house's waId) the listing shows no phone, only its other contacts. */
export async function moveListingToNumber(submission: ListingToMove, waId: string) {
  await prisma.$transaction(async (tx) => {
    const seller = await tx.seller.upsert({ where: { waId }, update: {}, create: { waId } });
    await tx.submission.update({ where: { id: submission.id }, data: { sellerId: seller.id } });
    if (submission.productId) {
      await tx.product.update({
        where: { id: submission.productId },
        data: { sellerId: seller.id, contactPhone: submission.hasContactConsent && /^\d+$/.test(waId) ? `+${waId}` : null },
      });
    }
  });
}
