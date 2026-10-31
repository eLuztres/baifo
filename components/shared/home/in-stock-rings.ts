import type { Prisma } from '@prisma/client';
import { prisma } from '@/db/prisma';
import { SHOWCASE_MODE, SHOWS_PRICES, type ListingType } from '@/lib/constants';
import { isReservationActive } from '@/lib/reservation';
import { RING_ORDER } from '@/lib/category';
import { coverPicture } from '@/lib/video';
import { startOfShopDay } from '@/lib/event-date';

// How many listings a page of the feed brings when it asks for none in particular.
const PAGE_SIZE = 24;
// After the store's order, the id keeps listings with the same order and date in one fixed order, so paging never skips one.
const PAGE_ORDER: Prisma.ProductOrderByWithRelationInput[] = [...RING_ORDER, { id: 'asc' }];

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
  /** When it goes offline (its paid time ends), if it does: for the feed's "Ending soon". */
  endsAt: Date | null;
  /** How a second-hand item is (PRODUCT_CONDITIONS), if known. */
  condition: string | null;
  /** Server only: a name of 1–3 words, for localizeProduct (null: none yet). */
  shortName?: string | null;
  /** Server only: its name in other languages (localizeProduct). */
  translations: unknown;
  /** Server only: its text, for the feed's search. */
  description: string;
  /** Server only: where it is, for the visitor's place filter. */
  placeId: string | null;
}

/** Only the rings in the visitor's places; one without a place stays, so nothing disappears unnoticed. */
export const inPlaces = <T extends Pick<CollectionRing, 'placeId'>>(rings: T[], placeIds?: string[]) =>
  placeIds ? rings.filter((ring) => !ring.placeId || placeIds.includes(ring.placeId)) : rings;

/** What a listing must be to show in the shop: in stock (showcase mode has no stock), with a photo, and not a past event. */
const inStockWhere = (): Prisma.ProductWhereInput => ({
  ...(SHOWCASE_MODE ? {} : { stock: { gt: 0 } }),
  images: { isEmpty: false },
  // An event leaves the shop once its day is over; no cron needed.
  OR: [{ startsAt: null }, { startsAt: { gte: startOfShopDay() } }],
});

const RING_SELECT = {
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
  description: true,
  type: true,
  serviceType: true,
  startsAt: true,
  placeId: true,
  categories: { select: { id: true } },
  expiresAt: true,
  submission: { select: { rawImages: true, expiresAt: true } },
} satisfies Prisma.ProductSelect;

// From the extended client, which hands prices over as strings.
type RingRow = Prisma.Result<typeof prisma.product, { select: typeof RING_SELECT }, 'findFirstOrThrow'>;

const toCollectionRing = ({ images, reservedUntil, categories, price, priceMax, submission, expiresAt, ...product }: RingRow): CollectionRing => {
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
    // A seller's listing ends with its submission; an admin's service has its own end.
    endsAt: submission?.expiresAt ?? expiresAt,
  };
};

interface RingQuery {
  /** Narrows the rings in stock further, e.g. to a few ids or one place. */
  where?: Prisma.ProductWhereInput;
  take?: number;
  /** The last ring of the previous page. */
  cursor?: string;
}

async function findInStockRings({ where, take, cursor }: RingQuery = {}): Promise<CollectionRing[]> {
  const products = await prisma.product.findMany({
    where: where ? { AND: [inStockWhere(), where] } : inStockWhere(),
    orderBy: PAGE_ORDER,
    take,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    select: RING_SELECT,
  });
  return products.map(toCollectionRing);
}

/** The rings in stock that have a photo, in the admin's order; `where` narrows them (e.g. to a few ids), no cap.
    Showcase mode has no stock: every ring with a photo is shown, without price or reservation. */
export const getInStockRings = (where?: Prisma.ProductWhereInput) => findInStockRings({ where });

export interface RingPage {
  rings: CollectionRing[];
  /** Pass it back for the next page; missing on the last one. */
  nextCursor?: string;
}

/** One page of the rings in stock, in the store's order, for a feed that loads more as it scrolls. */
export async function getInStockRingsPage({ where, take = PAGE_SIZE, cursor }: RingQuery = {}): Promise<RingPage> {
  // One more than asked says whether another page follows, without counting.
  const rings = await findInStockRings({ where, take: take + 1, cursor });
  return rings.length > take ? { rings: rings.slice(0, take), nextCursor: rings[take - 1].id } : { rings };
}

/** A listing as the home and the swipe to the next one need it: enough to count, order and pick, nothing to show. */
export interface RingSummary {
  id: string;
  slug: string;
  createdAt: Date;
  placeId: string | null;
  categoryIds: string[];
}

/** Every ring in stock in the store's order, light: the home shows only a few per category and loads those in full. */
export async function getRingSummaries(): Promise<RingSummary[]> {
  const products = await prisma.product.findMany({
    where: inStockWhere(),
    orderBy: PAGE_ORDER,
    select: { id: true, slug: true, createdAt: true, placeId: true, categories: { select: { id: true } } },
  });
  return products.map(({ categories, ...product }) => ({ ...product, categoryIds: categories.map((category) => category.id) }));
}

/** Slug and date of every ring in stock, for the sitemap. */
export function getInStockSlugs() {
  return prisma.product.findMany({ where: inStockWhere(), orderBy: PAGE_ORDER, select: { slug: true, createdAt: true } });
}
