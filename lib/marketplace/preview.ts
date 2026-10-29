import { prisma } from '@/db/prisma';
import { HOUSE_SELLER } from './config';
import { isLinkExpired } from './listing-payment';

const UUID = /^[0-9a-f-]{36}$/i;

// Everything the private page shows. Nothing about the seller: a forwarded link must not reach the person.
const PREVIEW_FIELDS = {
  status: true,
  sentAt: true,
  type: true,
  title: true,
  description: true,
  translations: true,
  images: true,
  rawImages: true,
  price: true,
  priceMax: true,
  condition: true,
  serviceType: true,
  startsAt: true,
  address: true,
  plan: true,
  consentAt: true,
  payClaimedAt: true,
  payClaimedMethod: true,
  paidAt: true,
  expiresAt: true,
  payCode: true,
  product: { select: { slug: true } },
  place: { select: { id: true, corral: { select: { name: true, address: true, venue: true, hours: true } } } },
  seller: { select: { waId: true } },
} as const;

/** Waiting for its first payment, online, or ended after it was paid once (and so renewable). */
const isOpenListing = (listing: { status: string; sentAt: Date | null; paidAt: Date | null }, now: Date) =>
  listing.status === 'LIVE' ||
  (listing.status === 'AWAITING_PAYMENT' && !isLinkExpired(listing.sentAt, now)) ||
  (listing.status === 'EXPIRED' && Boolean(listing.paidAt));

/** The listing behind a private link, or null for an unknown, expired or no longer open link. */
export async function getListingPreview(token: string, now = new Date()) {
  if (!UUID.test(token)) return null;
  const listing = await prisma.submission.findUnique({ where: { payToken: token }, select: PREVIEW_FIELDS });
  if (!listing) return null;
  if (!isOpenListing(listing, now)) return null;
  // Only whether there is a number to confirm "sold" with; the number itself stays on the server.
  const { seller, ...preview } = listing;
  return { ...preview, hasSellerPhone: seller.waId !== HOUSE_SELLER };
}

export type ListingPreview = NonNullable<Awaited<ReturnType<typeof getListingPreview>>>;
