import { prisma } from '@/db/prisma';
import { SHOWS_PRICES } from '@/lib/constants';
import { getListingMercadillos } from '@/lib/mercadillos';
import { REPEAT_SELECT } from '@/lib/event-repeat';
import { cachePublicRead, STABLE_DATA_SECONDS } from '@/lib/public-cache';

/** A listing's page row. Not a server action: it holds the seller's number and email, which never reach the browser. */
export const getProductBySlug = cachePublicRead('product-by-slug', async (slug: string) => {
  const product = await prisma.product.findFirst({
    where: { slug: slug },
    // Showcase mode: the price is never read, so no page can send it.
    omit: { price: !SHOWS_PRICES },
    // Baifo: the seller's name and language for "Offered by" and the message to them; the page sends only what it shows.
    include: { submission: { select: { id: true, sellerName: true, sellerLocale: true, contactEmail: true, contactWeb: true, contactInstagram: true, seller: { select: { waId: true, name: true } }, tags: { select: { id: true, names: true } }, partnerId: true, partner: { select: { slug: true, name: true, icon: true } }, ...REPEAT_SELECT } } },
  });
  if (!product) return null;
  const mercadillos = await getListingMercadillos({ products: { some: { id: product.id } } }, product.submission?.tags.map((tag) => tag.id) ?? []);
  return { ...product, mercadillos };
}, STABLE_DATA_SECONDS);
