import { prisma } from '@/db/prisma';

interface ListingToMove {
  id: string;
  productId: string | null;
  hasContactConsent: boolean;
  seller: { name: string | null };
}

/** Buyers write to the new number and it closes the listing from now on: the seller's own change and the admin's. */
export async function moveListingToNumber(submission: ListingToMove, waId: string) {
  await prisma.$transaction(async (tx) => {
    // A number new to Baifo keeps the WhatsApp name the listing showed until now.
    const seller = await tx.seller.upsert({ where: { waId }, update: {}, create: { waId, name: submission.seller.name } });
    await tx.submission.update({ where: { id: submission.id }, data: { sellerId: seller.id } });
    if (submission.productId) {
      await tx.product.update({
        where: { id: submission.productId },
        data: { sellerId: seller.id, contactPhone: submission.hasContactConsent ? `+${waId}` : null },
      });
    }
  });
}
