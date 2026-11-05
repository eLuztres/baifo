import { isLocale, type Locale } from '@/lib/i18n-core';
import { HOUSE_SELLER } from './config';
import { localeOf } from './messages';

interface ListingSeller {
  sellerName: string | null;
  sellerLocale: string | null;
  seller: { waId: string };
}

/** Who buyers see and write to: the listing's own name, and its language or else their number's. */
export function sellerIdentity({ sellerName, sellerLocale, seller }: ListingSeller): { name: string | null; locale: Locale | null } {
  const isPerson = seller.waId !== HOUSE_SELLER;
  return {
    name: sellerName || null,
    locale: isLocale(sellerLocale) ? sellerLocale : isPerson ? localeOf(seller.waId) : null,
  };
}

/** A Spanish mobile without country code gets +34; no number is the house seller. */
export const toWaId = (digits?: string) => (digits ? (digits.length === 9 ? `34${digits}` : digits) : HOUSE_SELLER);
