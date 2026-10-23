import { BRAND } from '@/lib/brand';

export const APP_NAME = BRAND.name;
export const SERVER_URL =
  process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000';
// Where admins land after signing in without a specific target (e.g. /admin/studio).
export const ADMIN_HOME_PATH = process.env.ADMIN_HOME_PATH || '/admin/overview';

// Comma-separated env lists, e.g. "PayPal, Stripe"; blank entries are ignored.
const envList = (key: string, fallback: string[]) => {
  const values = (process.env[key] ?? '').split(',').map((value) => value.trim()).filter(Boolean);
  return values.length > 0 ? values : fallback;
};

export const PAYMENT_METHODS = envList('PAYMENT_METHODS', ['PayPal', 'Stripe', 'CashOnDelivery']);
export const DEFAULT_PAYMENT_METHOD =
  process.env.DEFAULT_PAYMENT_METHOD || PAYMENT_METHODS[0];

export const PAGE_SIZE = Number(process.env.PAGE_SIZE) || 12;

// Server-side only like the rest of this file: the admin user form gets it as a prop.
export const USER_ROLES = envList('USER_ROLES', ['admin', 'user']);

export const SENDER_EMAIL = process.env.SENDER_EMAIL || 'onboarding@resend.dev'

export const CONTACT_EMAIL = BRAND.contact.email;
// Who gets an email for every new order; comma-separated, defaults to the contact email.
export const ORDER_ALERT_EMAILS = (process.env.ORDER_ALERT_EMAIL || CONTACT_EMAIL || '')
  .split(',')
  .map((email) => email.trim())
  .filter(Boolean);

// Google login only shows up when the shop has its own OAuth credentials.
export const GOOGLE_AUTH_ENABLED = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);

const envNumber = (key: string, fallback: number) => {
  const value = Number(process.env[key]);
  return process.env[key] && !Number.isNaN(value) ? value : fallback;
};

// Showcase mode: a presentation, not a shop. Prices never leave the database, stock is ignored
// and visitors can only say they're interested in a ring; set per shop in .env.
export const SHOWCASE_MODE = process.env.SHOWCASE_MODE === 'true';

// How long a ring stays reserved for a customer after "Show interest"; set per shop in .env.
export const RESERVATION_HOURS = envNumber('RESERVATION_HOURS', 48);

// Pricing rules used by the cart; set per shop in .env.
export const TAX_RATE = envNumber('TAX_RATE', 0);
export const SHIPPING_PRICE = envNumber('SHIPPING_PRICE', 10);
export const FREE_SHIPPING_THRESHOLD = envNumber('FREE_SHIPPING_THRESHOLD', 100);

export interface PriceClass {
  name: string;
  price: string;
}

// A product in a price class takes the class price; e.g. PRICE_CLASSES="Essential:60, Premium:120".
export const PRICE_CLASSES: PriceClass[] = (process.env.PRICE_CLASSES || '')
  .split(',')
  .map((entry) => entry.split(':').map((part) => part.trim()))
  .filter(([name, price]) => name && price && !Number.isNaN(Number(price)))
  .map(([name, price]) => ({ name, price: Number(price).toFixed(2) }));

export { CURRENCY, NUMBER_LOCALE, SHOP_TIME_ZONE } from './currency';
export * from './form-defaults';
