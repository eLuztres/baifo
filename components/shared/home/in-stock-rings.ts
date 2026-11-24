import type { Prisma } from '@prisma/client';
import { prisma } from '@/db/prisma';
import { SHOWCASE_MODE, SHOWS_PRICES, type ListingType, type PriceMode } from '@/lib/constants';
import { isReservationActive } from '@/lib/reservation';
import { RING_ORDER } from '@/lib/localize';
import { coverPicture } from '@/lib/video';
import { getLocale, getPictureFallbackLocales } from '@/lib/i18n-server';
import type { Locale } from '@/lib/i18n-core';
import { localizePictures } from '@/lib/marketplace/pictures';
import { startOfShopDay } from '@/lib/event-date';
import type { TagNames } from '@/lib/tag-names';
import { cachePublicRead, STABLE_DATA_SECONDS } from '@/lib/public-cache';

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
  /** An item for sale, a wanted ad ("Busco …": its price is the budget of the person looking), a service or an event. */
  type: ListingType;
  /** A service's kind of offer (SERVICE_TYPES). */
  serviceType?: string | null;
  /** How its price reads ("from 20 €", "up to 20 €"); missing in showcase mode. */
  priceMode?: PriceMode;
  /** An event or workshop: when it starts; it is only listed until the end of that day. */
  startsAt?: Date | null;
  /** A repeating event: startsAt is its next date. */
  isRepeating?: boolean;
  /** An item whose picture the AI made from words alone (no photo of the real thing): buyers see a note. */
  isIllustrative?: boolean;
  isReserved: boolean;
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
  /** Server only: the Mercadillos it is in, for their rows in the list. */
  mercadilloIds: string[];
  /** How its pictures move on its card (PICTURE_MOTIONS). */
  pictureMotion: string;
  /** Server only: its etiquetas, for the feed's search and its cards. */
  tags: { id: string; names: TagNames }[];
  /** Server only: the partner's mercadillo it belongs to; the plain list shows that mercadillo's card instead. */
  partnerId: string | null;
}

/** Only the rings in the visitor's places; one without a place stays, so nothing disappears unnoticed. */
export const inPlaces = <T extends Pick<CollectionRing, 'placeId'>>(rings: T[], placeIds?: string[]) =>
  placeIds ? rings.filter((ring) => !ring.placeId || placeIds.includes(ring.placeId)) : rings;

/** What a listing must be to show in the shop: in stock (showcase mode has no stock), with a photo, not a past event and not past its end. */
const inStockWhere = (): Prisma.ProductWhereInput => ({
  ...(SHOWCASE_MODE ? {} : { stock: { gt: 0 } }),
  images: { isEmpty: false },
  // An event leaves the shop once its day is over; no cron needed.
  OR: [{ startsAt: null }, { startsAt: { gte: startOfShopDay() } }],
  // Past its end it leaves at once, by the same end the daily run uses: the listing's own, or an admin service's. One without
  // an end stays (a "Solo aquí" selección's): spelled out without NOT, which would also drop it (NULL).
  AND: [
    { OR: [{ submission: { is: null } }, { submission: { is: { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] } } }] },
    { NOT: { submission: { is: null }, expiresAt: { lte: new Date() } } },
  ],
});

/** What time can change about a listing in the shop. */
interface ShopTimes {
  startsAt?: Date | null;
  expiresAt?: Date | null;
  submission?: { expiresAt: Date | null } | null;
}

const TIMES_SELECT = { startsAt: true, expiresAt: true, submission: { select: { expiresAt: true } } } satisfies Prisma.ProductSelect;

/**
 * Whether a listing that was in the shop when its row was cached still is. Time only takes listings out (an end passed,
 * an event's day over), by the same rules as inStockWhere, so cached rows stay right without a clock.
 */
export function isStillInShop({ startsAt, expiresAt, submission }: ShopTimes, now = new Date()) {
  const end = submission ? submission.expiresAt : expiresAt;
  return !(startsAt && startsAt < startOfShopDay(now)) && !(end && end <= now);
}

const RING_SELECT = {
  id: true,
  slug: true,
  name: true,
  shortName: true,
  images: true,
  pictureLanguages: true,
  price: SHOWS_PRICES,
  priceMode: SHOWS_PRICES,
  reservedUntil: !SHOWCASE_MODE,
  createdAt: true,
  condition: true,
  translations: true,
  description: true,
  type: true,
  serviceType: true,
  startsAt: true,
  placeId: true,
  mercadillos: { select: { id: true } },
  pictureMotion: true,
  expiresAt: true,
  submission: { select: { rawImages: true, expiresAt: true, repeatFrequency: true, partnerId: true, tags: { select: { id: true, names: true } } } },
} satisfies Prisma.ProductSelect;

// From the extended client, which hands prices over as strings.
type RingRow = Prisma.Result<typeof prisma.product, { select: typeof RING_SELECT }, 'findFirstOrThrow'>;

/** A ring with only the pictures for the visitor's language (`locale`, else the first of `fallbacks` with some). */
const toCollectionRing = (locale: Locale, fallbacks: Locale[]) => ({ images: allImages, pictureLanguages, reservedUntil, price, submission, expiresAt, mercadillos, ...product }: RingRow): CollectionRing => {
  const { type } = product;
  const images = localizePictures(allImages, pictureLanguages, locale, fallbacks);
  return {
    ...product,
    // A listing without a price, and a free event (0): no amount to show.
    price: product.priceMode === 'NONE' || (type === 'EVENT' && Number(price) === 0) ? undefined : price,
    // Services and wanted ads are illustrative by nature; only an item could be taken for the real one.
    isIllustrative: (type === 'PRODUCT' || type === 'EVENT') && Boolean(submission && submission.rawImages.length === 0),
    isRepeating: type === 'EVENT' && Boolean(submission?.repeatFrequency),
    image: coverPicture(images) ?? images[0],
    images,
    mercadilloIds: mercadillos.map((mercadillo) => mercadillo.id),
    isReserved: isReservationActive({ reservedUntil }),
    tags: submission?.tags.map(({ id, names }) => ({ id, names: names as TagNames })) ?? [],
    partnerId: submission?.partnerId ?? null,
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

const queryInStockRows = ({ where, take, cursor }: RingQuery) =>
  prisma.product.findMany({
    where: where ? { AND: [inStockWhere(), where] } : inStockWhere(),
    orderBy: PAGE_ORDER,
    take,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    select: RING_SELECT,
  });

// The same rows for every visitor: the language's pictures, and what time took out since, are applied after the cache.
const findCachedInStockRows = cachePublicRead('in-stock-rings', queryInStockRows, STABLE_DATA_SECONDS);

async function findInStockRings(query: RingQuery = {}): Promise<CollectionRing[]> {
  // A page is read fresh: taking rows out of it afterwards would leave it short.
  const isPage = query.take !== undefined || Boolean(query.cursor);
  const products = isPage ? await queryInStockRows(query) : (await findCachedInStockRows(query)).filter((row) => isStillInShop(row));
  return products.map(toCollectionRing(await getLocale(), getPictureFallbackLocales()));
}

// Every listing's, so one cache entry serves every filter of the list; only the name, so no seller's number is copied.
const findSellerRows = cachePublicRead(
  'seller-names',
  () => prisma.product.findMany({ select: { id: true, submission: { select: { sellerName: true } } } }),
  STABLE_DATA_SECONDS
);

/** The name each listing's page shows ("Ofrecido por …"), for lists of listings; a listing without one has none. */
export async function getSellerNames(ids: string[]) {
  const wanted = new Set(ids);
  const rows = (await findSellerRows()).filter(({ id }) => wanted.has(id));
  return new Map(rows.map(({ id, submission }) => [id, submission && (submission.sellerName || null)]));
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
}

const findSummaryRows = cachePublicRead(
  'ring-summaries',
  (where?: Prisma.ProductWhereInput) =>
    prisma.product.findMany({
      where: where ? { AND: [inStockWhere(), where] } : inStockWhere(),
      orderBy: PAGE_ORDER,
      select: { id: true, slug: true, createdAt: true, placeId: true, ...TIMES_SELECT },
    }),
  STABLE_DATA_SECONDS
);

/** Every ring in stock in the store's order, light: for the swipe to the next one; `where` narrows them. */
export async function getRingSummaries(where?: Prisma.ProductWhereInput): Promise<RingSummary[]> {
  const rows = (await findSummaryRows(where)).filter((row) => isStillInShop(row));
  return rows.map(({ id, slug, createdAt, placeId }) => ({ id, slug, createdAt, placeId }));
}

const findTodayRows = cachePublicRead(
  'today-candidates',
  () => prisma.product.findMany({ where: inStockWhere(), select: { createdAt: true, type: true, placeId: true, ...TIMES_SELECT } }),
  STABLE_DATA_SECONDS
);

/** Every ring in stock, light: enough to say which are in Hoy and in the visitor's places. */
export async function getTodayCandidates() {
  const rows = (await findTodayRows()).filter((row) => isStillInShop(row));
  return rows.map(({ createdAt, type, startsAt, placeId }) => ({ createdAt, type, startsAt, placeId }));
}

/** Slug and date of every ring in stock, for the sitemap. */
export function getInStockSlugs() {
  return prisma.product.findMany({ where: inStockWhere(), orderBy: PAGE_ORDER, select: { slug: true, createdAt: true } });
}
