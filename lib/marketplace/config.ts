import { SERVER_URL } from '@/lib/constants';
import { formatNumber } from '@/lib/utils';

// Baifo's marketplace settings, all from .env (see .env.example).
const env = (key: string) => process.env[key]?.trim() || undefined;

export type ListingPlan = 'normal' | 'big';

/** Your own number (without +): it gets every listing to review and the "new product online" messages. */
export const ADMIN_WHATSAPP_NUMBER = env('ADMIN_WHATSAPP_NUMBER')?.replace(/\D/g, '');

/** How long a paid listing stays online. */
export const LISTING_DAYS = Number(env('LISTING_DAYS') ?? 90);

/** The listing fee per plan, as fixed-2 strings like the shop's other prices. */
export const LISTING_PRICES: Record<ListingPlan, string> = {
  normal: Number(env('LISTING_PRICE_NORMAL') ?? 5).toFixed(2),
  big: Number(env('LISTING_PRICE_BIG') ?? 10).toFixed(2),
};

/** The cheapest listing as texts say it, e.g. "from 5 euros". */
export const LISTING_FROM_PRICE = formatNumber(Number(LISTING_PRICES.normal));

/** Gets the printable list of all live products after each new listing. */
export const LISTINGS_EMAIL = env('LISTINGS_EMAIL');

/** Where event addresses are searched (west,south,east,north); default: Fuerteventura. "none": everywhere. */
const addressArea = env('ADDRESS_AREA') ?? '-14.55,27.99,-13.80,28.78';
export const ADDRESS_AREA = addressArea === 'none' ? undefined : addressArea;

/** A failed AI step is retried this often (by the cron) before the admin is told. */
export const MAX_PROCESSING_ATTEMPTS = 3;

export const publishUrl = (payToken: string) => `${SERVER_URL}/publicar/${payToken}`;
export const productUrl = (slug: string) => `${SERVER_URL}/product/${slug}`;

/** The seller of listings the admin makes without a seller's WhatsApp (no phone, so never messaged). */
export const HOUSE_SELLER = 'baifo';

export const isAdminNumber = (waId: string) => Boolean(ADMIN_WHATSAPP_NUMBER) && waId === ADMIN_WHATSAPP_NUMBER;
