import { prisma } from '@/db/prisma';
import { SHOWS_PRICES } from '@/lib/constants';

/** A listing's page row. Not a server action: it holds the seller's number and email, which never reach the browser. */
export async function getProductBySlug(slug: string) {
  return await prisma.product.findFirst({
    where: { slug: slug },
    // Showcase mode: the price is never read, so no page can send it.
    omit: { price: !SHOWS_PRICES },
    // Baifo: the seller's name and language for "Offered by" and the message to them; the page sends only what it shows.
    include: { submission: { select: { id: true, sellerName: true, sellerLocale: true, contactEmail: true, contactWeb: true, contactInstagram: true, seller: { select: { waId: true, name: true } }, tags: { select: { id: true, names: true } } } }, mercadillos: { select: { slug: true, name: true, icon: true }, orderBy: { sortOrder: 'asc' } } },
  });
}
