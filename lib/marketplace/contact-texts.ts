import { localize, localizeProduct } from '@/lib/category';
import { APP_NAME, SERVER_URL, type ListingType } from '@/lib/constants';
import { getTranslator, type TranslationKey } from '@/lib/i18n';
import { getShopLocale } from '@/lib/i18n-server';

const MESSAGE_KEYS = {
  PRODUCT: 'CONTACT_MESSAGE_PRODUCT',
  WANTED: 'CONTACT_MESSAGE_WANTED',
  SERVICE: 'CONTACT_MESSAGE_SERVICE',
  EVENT: 'CONTACT_MESSAGE_EVENT',
} as const satisfies Record<ListingType, TranslationKey>;

interface ContactListing {
  slug: string;
  type: ListingType;
  name: string;
  translations: unknown;
}

// Empty lines to start typing in. WhatsApp cuts them off a message's end, so an invisible character holds them.
const ROOM_TO_TYPE = '\n\n\n\u200B';

/** The WhatsApp message to a listing's seller, greeting them by name when the listing has one; always in the shop's language so it stays simple; only the text goes to the browser, not the number. */
export function getContactMessage(listing: ContactListing, sellerName?: string | null): string {
  const locale = getShopLocale();
  const t = getTranslator(locale);
  const { name } = localizeProduct(listing, locale);
  const hello = sellerName ? t('CONTACT_MESSAGE_HELLO_NAME', { name: sellerName }) : t('CONTACT_MESSAGE_HELLO');
  return t(MESSAGE_KEYS[listing.type], { hello, name, shop: APP_NAME, url: `${SERVER_URL}/product/${listing.slug}` }).trimEnd() + ROOM_TO_TYPE;
}

/** The prefilled message to a Mercadillo, in the shop's language. */
export function getMercadilloContactMessage(mercadillo: { name: unknown; slug: string }): string {
  const locale = getShopLocale();
  return getTranslator(locale)('MERCADILLO_CONTACT_MESSAGE', { name: localize(mercadillo.name, locale), shop: APP_NAME, url: `${SERVER_URL}/explore?mercadillo=${mercadillo.slug}` });
}
