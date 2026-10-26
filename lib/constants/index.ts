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

// Where the shop works for now, e.g. a launch in one town; blank means everywhere and hides the notice.
export const SERVICE_AREA = process.env.SERVICE_AREA?.trim() || '';

// The shop owner's login email: only the owner can make, change or delete admins, and nobody can remove the owner.
export const OWNER_EMAIL = process.env.OWNER_EMAIL?.trim().toLowerCase() || '';

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
// A showcase that still shows prices (e.g. a classifieds board where buyers contact the seller).
export const SHOWS_PRICES = !SHOWCASE_MODE || process.env.SHOWCASE_SHOW_PRICES === 'true';
// A service (babysitter, gardener …) is listed like a product but never shows a price or a cart, only its contact.
export const PRODUCT_KINDS = ['product', 'service'] as const;
export type ProductKind = (typeof PRODUCT_KINDS)[number];
// The store category that holds the services; its subcategories are the kinds of service.
export const SERVICES_CATEGORY_SLUG = process.env.SERVICES_CATEGORY_SLUG || 'servicios';
// The category of wanted ads ("Busco …"); its subcategories are what people look for. A shop without it has none.
export const WANTED_CATEGORY_SLUG = process.env.WANTED_CATEGORY_SLUG || 'busco';
// How a second-hand item is, best first; a product without one shows none.
export const PRODUCT_CONDITIONS = ['new', 'like_new', 'good', 'fair'] as const;
export type ProductCondition = (typeof PRODUCT_CONDITIONS)[number];

const CONDITION_KEYS = {
  new: 'CONDITION_NEW',
  like_new: 'CONDITION_LIKE_NEW',
  good: 'CONDITION_GOOD',
  fair: 'CONDITION_FAIR',
} as const satisfies Record<ProductCondition, string>;

/** The text key of a product's condition, or none for a missing or unknown one. */
export const conditionKey = (condition?: string | null) =>
  PRODUCT_CONDITIONS.includes(condition as ProductCondition) ? CONDITION_KEYS[condition as ProductCondition] : undefined;
// The AI product studio needs an OpenAI key; without one, new products use the plain product form.
export const IS_STUDIO_ENABLED = Boolean(process.env.OPENAI_API_KEY);
// Where the admin menu's "New product" leads; a shop with its own creation flow sets it in .env.
export const NEW_PRODUCT_PATH =
  process.env.ADMIN_NEW_PRODUCT_PATH || (IS_STUDIO_ENABLED ? '/admin/studio' : '/admin/products/create');
export const NEW_SERVICE_PATH = '/admin/listings/new?kind=service';
/** Where "Add a product" in a category leads: the studio files it there; a listing shop starts a listing of the right kind. */
export const newProductPathFor = (category: { id: string; slug: string }) => {
  if (category.slug === SERVICES_CATEGORY_SLUG) return NEW_SERVICE_PATH;
  if (category.slug === WANTED_CATEGORY_SLUG) return '/admin/listings/new?kind=wanted';
  return NEW_PRODUCT_PATH === '/admin/studio' ? `/admin/studio?category=${category.id}` : NEW_PRODUCT_PATH;
};

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
