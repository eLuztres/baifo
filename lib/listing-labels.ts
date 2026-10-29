import type { CollectionRing } from '@/components/shared/home/in-stock-rings';
import { SERVICE_TYPES, SHOWS_PRICES, type ServiceType } from '@/lib/constants';
import { formatEventDate } from '@/lib/event-date';
import type { Translator } from '@/lib/i18n-core';

const SERVICE_TYPE_KEYS = {
  class: 'SERVICE_TYPE_CLASS',
  service: 'SERVICE_TYPE_SERVICE',
  support: 'SERVICE_TYPE_SUPPORT',
} as const satisfies Record<ServiceType, string>;

/** The text key of a service's kind of offer, or none for a missing or unknown one. */
export const serviceTypeKey = (serviceType?: string | null) =>
  SERVICE_TYPES.includes(serviceType as ServiceType) ? SERVICE_TYPE_KEYS[serviceType as ServiceType] : undefined;

type LabelledListing = Pick<CollectionRing, 'price' | 'priceMax' | 'type' | 'isFromPrice' | 'serviceType' | 'startsAt'>;

/** A wanted ad's budget label: "Budget up to" when it has only an upper end. */
export const wantedBudgetKey = (price?: string | number | null, priceMax?: string | number | null) =>
  priceMax && !Number(price) ? 'WANTED_BUDGET_UP_TO' : 'WANTED_BUDGET';

/** What a feed card says around a listing's price: "Budget" or "from" before it, "Free" for a free event, and its badge:
    the event's date, the service's kind of offer, or "Busco". */
export function feedCardLabels(listing: LabelledListing, t: Translator, locale: string, now = new Date()) {
  const serviceKey = serviceTypeKey(listing.serviceType);
  return {
    priceLabel: listing.type === 'WANTED' ? t(wantedBudgetKey(listing.price, listing.priceMax)) : listing.isFromPrice ? t('PRICE_FROM') : undefined,
    priceText: listing.type === 'EVENT' && SHOWS_PRICES && !listing.price ? t('EVENT_FREE') : undefined,
    badge:
      listing.type === 'EVENT' && listing.startsAt
        ? // Short, so it fits a 320px phone's small tile.
          formatEventDate(listing.startsAt, locale, t('EVENT_TODAY'), now, undefined, 'short')
        : listing.type === 'SERVICE'
          ? t(serviceKey ?? 'EXPLORE_SERVICE_BADGE')
          : listing.type === 'WANTED'
            ? t('EXPLORE_WANTED_BADGE')
            : undefined,
  };
}
