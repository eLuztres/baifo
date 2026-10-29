import type { Prisma } from '@prisma/client';
import { OFFER_ICONS, type OfferIcon } from '@/lib/constants';
import { localize } from '@/lib/category';
import type { Locale } from '@/lib/i18n-core';

export type OfferStatus = 'running' | 'upcoming' | 'ended' | 'hidden';

interface OfferWindow {
  startsAt: Date;
  endsAt: Date;
  isActive: boolean;
}

/** Where an offer stands now: an ended one stays ended, a switched-off one is hidden until it ends. */
export function offerStatus({ startsAt, endsAt, isActive }: OfferWindow, now = new Date()): OfferStatus {
  if (endsAt <= now) return 'ended';
  if (!isActive) return 'hidden';
  return startsAt <= now ? 'running' : 'upcoming';
}

export const isOfferRunning = (offer: OfferWindow, now = new Date()) => offerStatus(offer, now) === 'running';

/** The same window as a query, so an offer comes and goes by itself, without anyone cleaning up. */
export const runningOfferWhere = (now = new Date()): Prisma.OfferWhereInput => ({
  isActive: true,
  startsAt: { lte: now },
  endsAt: { gt: now },
});

/** An offer as visitors see it: its texts in their language. */
export interface OfferView {
  id: string;
  icon: OfferIcon;
  title: string;
  text: string;
  audience: string;
  linkUrl: string | null;
  image: string | null;
  endsAt: string;
}

/** An offer with the texts around it already in the visitor's language. */
export interface OfferItem {
  offer: OfferView;
  /** "Until 30 November, 23:59" */
  untilLabel: string;
}

interface StoredOffer {
  id: string;
  icon: string;
  title: unknown;
  text: unknown;
  audience: unknown;
  linkUrl: string | null;
  image: string | null;
  endsAt: Date;
}

const iconOf = (icon: string): OfferIcon => OFFER_ICONS.find((name) => name === icon) ?? 'Megaphone';

export const localizeOffer = (offer: StoredOffer, locale: Locale): OfferView => ({
  id: offer.id,
  icon: iconOf(offer.icon),
  title: localize(offer.title, locale),
  text: localize(offer.text, locale),
  audience: localize(offer.audience, locale),
  linkUrl: offer.linkUrl,
  image: offer.image,
  endsAt: offer.endsAt.toISOString(),
});
