import { cache } from 'react';
import { prisma } from '@/db/prisma';
import { OFFERS_ENABLED, SHOP_TIME_ZONE } from '@/lib/constants';
import { getT } from '@/lib/i18n-server';
import { localizeOffer, runningOfferWhere, type OfferItem } from '@/lib/offers-core';

/** The offers running right now, in the visitor's language; one query per request (layout, header and page share it). */
export const getRunningOffers = cache(async (): Promise<OfferItem[]> => {
  if (!OFFERS_ENABLED) return [];
  const [offers, { t, locale }] = await Promise.all([
    prisma.offer.findMany({ where: runningOfferWhere(), orderBy: [{ sortOrder: 'asc' }, { startsAt: 'asc' }] }),
    getT(),
  ]);
  return offers.map((offer) => {
    const date = offer.endsAt.toLocaleString(locale === 'en' ? 'en-GB' : locale, {
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: SHOP_TIME_ZONE,
    });
    return { offer: localizeOffer(offer, locale), untilLabel: t('OFFERS_UNTIL', { date }) };
  });
});
