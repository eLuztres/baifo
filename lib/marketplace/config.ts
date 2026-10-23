import { SERVER_URL } from '@/lib/constants';

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

/** Gets the printable list of all live products after each new listing. */
export const LISTINGS_EMAIL = env('LISTINGS_EMAIL');

/** A failed AI step is retried this often (by the cron) before the admin is told. */
export const MAX_PROCESSING_ATTEMPTS = 3;

export const publishUrl = (payToken: string) => `${SERVER_URL}/publicar/${payToken}`;
export const productUrl = (slug: string) => `${SERVER_URL}/product/${slug}`;

export const isAdminNumber = (waId: string) => Boolean(ADMIN_WHATSAPP_NUMBER) && waId === ADMIN_WHATSAPP_NUMBER;
