import { prisma } from '@/db/prisma';
import { SHOWCASE_MODE } from '@/lib/constants';
import { isReservationActive } from '@/lib/reservation';
import { RING_ORDER } from '@/lib/category';

// A one-maker shop: the whole collection fits on one page, so no ring stays hidden behind paging.
const COLLECTION_LIMIT = 500;

/** A ring as the home page needs it: only these fields reach the page, never who holds a reservation. */
export interface CollectionRing {
  id: string;
  slug: string;
  name: string;
  image: string;
  /** Server only: all its pictures, for the previews in the shop's tree. */
  images: string[];
  /** Missing in showcase mode: the price is never read from the database. */
  price?: string;
  isReserved: boolean;
  /** Server only: the store categories it shows up in. */
  categoryIds: string[];
}

/** The rings in stock that have a photo, in the admin's order; the opening scene and the store are both built from them.
    Showcase mode has no stock: every ring with a photo is shown, without price or reservation. */
export async function getInStockRings(): Promise<CollectionRing[]> {
  const products = await prisma.product.findMany({
    where: { ...(SHOWCASE_MODE ? {} : { stock: { gt: 0 } }), images: { isEmpty: false } },
    orderBy: RING_ORDER,
    take: COLLECTION_LIMIT,
    select: {
      id: true,
      slug: true,
      name: true,
      images: true,
      price: !SHOWCASE_MODE,
      reservedUntil: !SHOWCASE_MODE,
      categories: { select: { id: true } },
    },
  });

  return products.map(({ images, reservedUntil, categories, ...product }) => ({
    ...product,
    image: images[0],
    images,
    isReserved: isReservationActive({ reservedUntil }),
    categoryIds: categories.map((category) => category.id),
  }));
}
