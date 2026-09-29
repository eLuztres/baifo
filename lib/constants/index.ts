import { BRAND } from '@/lib/brand';

export const APP_NAME = BRAND.name;
export const APP_DESCRIPTION = BRAND.description;
export const SERVER_URL =
  process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000';
export const LATEST_PRODUCTS_LIMIT =
  Number(process.env.LATEST_PRODUCTS_LIMIT) || 4;

export const signInDefaultValues = {
  email: '',
  password: '',
};

export const signUpDefaultValues = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
};


export const shippingAddressDefaultValues = {
  fullName: '',
  streetAddress: '',
  city: '',
  postalCode: '',
  country: '',
};


export const PAYMENT_METHODS = process.env.PAYMENT_METHODS
  ? process.env.PAYMENT_METHODS.split(',').map((method) => method.trim())
  : ['PayPal', 'Stripe', 'CashOnDelivery'];
export const DEFAULT_PAYMENT_METHOD =
  process.env.DEFAULT_PAYMENT_METHOD || PAYMENT_METHODS[0];

  export const PAGE_SIZE = Number(process.env.PAGE_SIZE) || 12;

  export const productDefaultValues = {
  name: '',
  slug: '',
  category: '',
  images: [],
  brand: '',
  description: '',
  price: '0',
  stock: 0,
  rating: '0',
  numReviews: '0',
  isFeatured: false,
  banner: null,
};


export const USER_ROLES = process.env.USER_ROLES
  ? process.env.USER_ROLES.split(', ')
  : ['admin', 'user'];


  export const reviewFormDefaultValues = {
  title: '',
  comment: '',
  rating: 0,
};

export const SENDER_EMAIL = process.env.SENDER_EMAIL || 'onboarding@resend.dev'

export const CONTACT_EMAIL = BRAND.contact.email;

// Google login only shows up when the shop has its own OAuth credentials.
export const GOOGLE_AUTH_ENABLED = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);

const envNumber = (key: string, fallback: number) => {
  const value = Number(process.env[key]);
  return process.env[key] && !Number.isNaN(value) ? value : fallback;
};

// Pricing rules used by the cart; set per shop in .env.
export const TAX_RATE = envNumber('TAX_RATE', 0);
export const SHIPPING_PRICE = envNumber('SHIPPING_PRICE', 10);
export const FREE_SHIPPING_THRESHOLD = envNumber('FREE_SHIPPING_THRESHOLD', 100);

export { CURRENCY, NUMBER_LOCALE } from './currency';
