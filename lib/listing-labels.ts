import type { CollectionRing } from '@/components/shared/home/in-stock-rings';
import { SERVICE_TYPES, SHOWS_PRICES, type ListingType, type PriceMode, type ServiceType } from '@/lib/constants';
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

type LabelledListing = Pick<CollectionRing, 'price' | 'priceMode' | 'type' | 'serviceType' | 'startsAt'>;

/** The text key said before a price: "from", or "up to" ("Budget up to" on a wanted ad); none for a set price. */
export const priceLabelKey = (type: ListingType, priceMode?: PriceMode | null) =>
  priceMode === 'FROM' ? 'PRICE_FROM' : priceMode === 'UP_TO' ? (type === 'WANTED' ? 'WANTED_BUDGET_UP_TO' : 'PRICE_UP_TO') : undefined;

const labelOf = (t: Translator, key?: ReturnType<typeof priceLabelKey>) => (key ? t(key) : undefined);

/** What a feed card says around a listing's price: "from" or "up to" before it, "Free" for a free event, and its
    badges: "Evento" with the event's date, or "Busco". Services get none: they read like any other offer. */
export function feedCardLabels(listing: LabelledListing, t: Translator, locale: string, now = new Date()) {
  const isEvent = listing.type === 'EVENT';
  return {
    priceLabel: listing.price ? labelOf(t, priceLabelKey(listing.type, listing.priceMode)) : undefined,
    priceText: isEvent && SHOWS_PRICES && !listing.price ? t('EVENT_FREE') : undefined,
    badge: isEvent ? t('EXPLORE_EVENT_BADGE') : listing.type === 'WANTED' ? t('EXPLORE_WANTED_BADGE') : undefined,
    // Short, so it fits a 320px phone's small tile next to "Evento".
    dateBadge: isEvent && listing.startsAt ? formatEventDate(listing.startsAt, locale, t('EVENT_TODAY'), now, undefined, 'short') : undefined,
  };
}
