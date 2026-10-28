import { prisma } from '@/db/prisma';
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
  crossPostFacebook: true,
  crossPostWallapop: true,
  consentAt: true,
  payCode: true,
  product: { select: { slug: true } },
  place: { select: { id: true, corral: { select: { name: true, address: true } } } },
} as const;

/** The listing behind a private link, or null for an unknown, expired or no longer open link. */
export async function getListingPreview(token: string, now = new Date()) {
  if (!UUID.test(token)) return null;
  const listing = await prisma.submission.findUnique({ where: { payToken: token }, select: PREVIEW_FIELDS });
  if (!listing) return null;
  if (listing.status === 'LIVE') return listing;
  if (listing.status !== 'AWAITING_PAYMENT' || isLinkExpired(listing.sentAt, now)) return null;
  return listing;
}

export type ListingPreview = NonNullable<Awaited<ReturnType<typeof getListingPreview>>>;
