import { prisma } from '@/db/prisma';
import { localizeProduct } from '@/lib/category';
import { APP_NAME, SERVER_URL, type ListingType } from '@/lib/constants';
import type { ContactMessageTexts } from '@/lib/contact-message';
import { getTranslator, type Locale, type TranslationKey } from '@/lib/i18n';
import { getEnabledLocales, getShopLocale } from '@/lib/i18n-server';
import { localeOf } from './messages';

const MESSAGE_KEYS = {
  PRODUCT: 'CONTACT_MESSAGE_PRODUCT',
  WANTED: 'CONTACT_MESSAGE_WANTED',
  SERVICE: 'CONTACT_MESSAGE_SERVICE',
  EVENT: 'CONTACT_MESSAGE_EVENT',
} as const satisfies Record<ListingType, TranslationKey>;

interface ContactListing {
  slug: string;
  type: ListingType;
  sellerId: string | null;
  name: string;
  translations: unknown;
}

/** The language a listing was written in: its seller's (from their number, as the bot talks to them), else the shop's. */
async function getListingLocale(sellerId: string | null): Promise<Locale> {
  const seller = sellerId ? await prisma.seller.findUnique({ where: { id: sellerId }, select: { waId: true } }) : null;
  const locale = seller && localeOf(seller.waId);
  return locale && getEnabledLocales().includes(locale) ? locale : getShopLocale();
}

/** The WhatsApp message to a listing's seller in the listing's language; only the texts go to the browser, not the number. */
export async function getContactMessageTexts(listing: ContactListing): Promise<ContactMessageTexts> {
  const locale = await getListingLocale(listing.sellerId);
  const t = getTranslator(locale);
  const { name } = localizeProduct(listing, locale);
  return {
    hello: t('CONTACT_MESSAGE_HELLO'),
    // Left without vars so `{nick}` and `{hello}` stay in for the browser.
    helloNamed: t('CONTACT_MESSAGE_HELLO_NAMED'),
    body: t(MESSAGE_KEYS[listing.type], { name, shop: APP_NAME, url: `${SERVER_URL}/product/${listing.slug}` }),
  };
}
