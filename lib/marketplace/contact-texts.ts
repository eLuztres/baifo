import { localizeProduct } from '@/lib/category';
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

/** The WhatsApp message to a listing's seller, always in the shop's language so it stays simple; only the text goes to the browser, not the number. */
export function getContactMessage(listing: ContactListing): string {
  const locale = getShopLocale();
  const t = getTranslator(locale);
  const { name } = localizeProduct(listing, locale);
  return t(MESSAGE_KEYS[listing.type], { hello: t('CONTACT_MESSAGE_HELLO'), name, shop: APP_NAME, url: `${SERVER_URL}/product/${listing.slug}` });
}
