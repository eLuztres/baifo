import { prisma } from '@/db/prisma';
import { SHOWCASE_MODE, SHOWS_PRICES, type ListingType } from '@/lib/constants';
import { isReservationActive } from '@/lib/reservation';
import { RING_ORDER } from '@/lib/category';
import { coverPicture } from '@/lib/video';
import { startOfShopDay } from '@/lib/event-date';

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
  /** Missing in showcase mode (the price is never read from the database), for a service without a "from" price and a free event. */
  price?: string;
  /** The upper end of a wanted ad's budget, if it is a range. */
  priceMax?: string;
  /** An item for sale, a wanted ad ("Busco …": its price is the budget of the person looking), a service or an event. */
  type: ListingType;
  /** A service's kind of offer (SERVICE_TYPES). */
  serviceType?: string | null;
  /** A service's price: shown as "from 20 €". */
  isFromPrice?: boolean;
  /** An event or workshop: when it starts; it is only listed until the end of that day. */
  startsAt?: Date | null;
  /** An item whose picture the AI made from words alone (no photo of the real thing): buyers see a note. */
  isIllustrative?: boolean;
  isReserved: boolean;
  /** Server only: the store categories it shows up in. */
  categoryIds: string[];
  /** When it went into the shop, for "2 days ago" and the newest first. */
  createdAt: Date;
  /** How a second-hand item is (PRODUCT_CONDITIONS), if known. */
  condition: string | null;
  /** Server only: a name of 1–3 words, for localizeProduct (null: none yet). */
  shortName?: string | null;
  /** Server only: its name in other languages (localizeProduct). */
  translations: unknown;
  /** Server only: where it is, for the visitor's place filter. */
  placeId: string | null;
}

/** Only the rings in the visitor's places; one without a place stays, so nothing disappears unnoticed. */
export const inPlaces = <T extends Pick<CollectionRing, 'placeId'>>(rings: T[], placeIds?: string[]) =>
  placeIds ? rings.filter((ring) => !ring.placeId || placeIds.includes(ring.placeId)) : rings;

/** The rings in stock that have a photo, in the admin's order; the opening scene and the store are both built from them.
    Showcase mode has no stock: every ring with a photo is shown, without price or reservation. */
export async function getInStockRings(): Promise<CollectionRing[]> {
  const products = await prisma.product.findMany({
    where: {
      ...(SHOWCASE_MODE ? {} : { stock: { gt: 0 } }),
      images: { isEmpty: false },
      // An event leaves the shop once its day is over; no cron needed.
      OR: [{ startsAt: null }, { startsAt: { gte: startOfShopDay() } }],
    },
    orderBy: RING_ORDER,
    take: COLLECTION_LIMIT,
    select: {
      id: true,
      slug: true,
      name: true,
      shortName: true,
      images: true,
      price: SHOWS_PRICES,
      priceMax: SHOWS_PRICES,
      reservedUntil: !SHOWCASE_MODE,
      createdAt: true,
      condition: true,
      translations: true,
      type: true,
      serviceType: true,
      startsAt: true,
      placeId: true,
      categories: { select: { id: true } },
      submission: { select: { rawImages: true } },
    },
  });

  return products.map(({ images, reservedUntil, categories, price, priceMax, submission, ...product }) => {
    const { type } = product;
    return {
      ...product,
      // 0 means none for a service (no "from" price) and free for an event: no amount to show.
      price: (type === 'SERVICE' || type === 'EVENT') && Number(price) === 0 ? undefined : price,
      priceMax: priceMax ?? undefined,
      isFromPrice: type === 'SERVICE' && Number(price) > 0,
      // Services and wanted ads are illustrative by nature; only an item could be taken for the real one.
      isIllustrative: (type === 'PRODUCT' || type === 'EVENT') && Boolean(submission && submission.rawImages.length === 0),
      image: coverPicture(images) ?? images[0],
      images,
      isReserved: isReservationActive({ reservedUntil }),
      categoryIds: categories.map((category) => category.id),
    };
  });
}
