import { z } from 'zod';
import { formatNumberWithDecimal } from './utils';
import type { TranslationKey } from './i18n-core';

// Messages are translation keys (checked here at compile time); FormMessage and the Toaster
// translate them. No env-based config is imported, because client forms use these schemas too.
const message = (key: TranslationKey) => key;

const currency = z
  .string()
  .trim()
  .min(1, message('VALIDATION_PRICE_FORMAT'))
  .refine(
    (value) => /^\d+(\.\d{2})?$/.test(formatNumberWithDecimal(Number(value))),
    message('VALIDATION_PRICE_FORMAT')
  );

/** Ids of products, orders and users (Postgres uuids), e.g. order ids and payment metadata. */
export const idSchema = z.string().uuid(message('VALIDATION_ID_INVALID'));

// Schema for inserting products
export const insertProductSchema = z.object({
  name: z.string().min(3, message('VALIDATION_NAME_MIN')),
  slug: z.string().min(3, message('VALIDATION_SLUG_MIN')),
  category: z.string().min(3, message('VALIDATION_CATEGORY_MIN')),
  brand: z.string().min(3, message('VALIDATION_BRAND_MIN')),
  description: z.string().min(3, message('VALIDATION_DESCRIPTION_MIN')),
  stock: z.coerce
    .number()
    .int(message('VALIDATION_STOCK_INVALID'))
    .nonnegative(message('VALIDATION_STOCK_INVALID')),
  images: z.array(z.string()).min(1, message('VALIDATION_IMAGES_REQUIRED')),
  isFeatured: z.boolean(),
  banner: z.string().nullable(),
  price: currency,
  priceClass: z.string().nullable().optional(),
  // The maker's photo the AI views are made from.
  sourceImage: z.string().nullable().optional(),
  // The store categories the ring shows up in.
  categoryIds: z.array(z.string().uuid(message('VALIDATION_ID_INVALID'))).optional(),
});

// Schema for updating products
export const updateProductSchema = insertProductSchema.extend({
  id: z.string().min(1, message('VALIDATION_ID_REQUIRED')),
});

const categoryTextSchema = (key: TranslationKey, max: number) =>
  z
    .record(z.string(), z.string().trim().max(max, message(key)))
    .refine((texts) => Object.values(texts).some(Boolean), message(key));

const sceneTextSchema = z.string().trim().max(600, message('VALIDATION_CATEGORY_SCENE'));

// A category of the store's ring; the name and text are given per language.
export const categorySchema = z.object({
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, message('VALIDATION_SLUG_MIN')),
  name: categoryTextSchema('VALIDATION_CATEGORY_NAME', 60),
  text: categoryTextSchema('VALIDATION_CATEGORY_TEXT', 300),
  image: z.string().nullable(),
  keywords: z.array(z.string().trim().toLowerCase().min(2).max(40)).max(20),
  scene: sceneTextSchema.min(10, message('VALIDATION_CATEGORY_SCENE')),
  sceneVariants: z.array(sceneTextSchema.min(3, message('VALIDATION_CATEGORY_SCENE'))).max(6),
});

export const updateCategorySchema = categorySchema.extend({ id: idSchema });
// A subcategory, e.g. a kind of service: only its name per language.
export const subcategorySchema = z.object({ name: categoryTextSchema('VALIDATION_CATEGORY_NAME', 60) });
export const updateSubcategorySchema = subcategorySchema.extend({ id: idSchema });
// The rings of one category in their new order.
export const ringOrderSchema = z.array(idSchema).min(2).max(500);

// Lowercased, so sign-in, sign-up and Google logins match the same account.
const emailSchema = z.string().trim().toLowerCase().email(message('VALIDATION_EMAIL_INVALID'));

// Schema for signing users in
export const signInFormSchema = z.object({
  email: emailSchema,
  password: z.string().min(6, message('VALIDATION_PASSWORD_MIN')),
});

// Schema for signing up a user
export const signUpFormSchema = z
  .object({
    name: z.string().min(3, message('VALIDATION_NAME_MIN')),
    email: emailSchema,
    password: z.string().min(6, message('VALIDATION_PASSWORD_MIN')),
    confirmPassword: z.string().min(6, message('VALIDATION_CONFIRM_PASSWORD_MIN')),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: message('VALIDATION_PASSWORDS_MISMATCH'),
    path: ['confirmPassword'],
  });

// Cart Schemas
export const cartItemSchema = z.object({
  productId: z.string().min(1, message('VALIDATION_PRODUCT_REQUIRED')),
  name: z.string().min(1, message('VALIDATION_NAME_REQUIRED')),
  slug: z.string().min(1, message('VALIDATION_SLUG_REQUIRED')),
  qty: z
    .number()
    .int(message('VALIDATION_QUANTITY_INVALID'))
    .nonnegative(message('VALIDATION_QUANTITY_INVALID')),
  image: z.string().min(1, message('VALIDATION_IMAGE_REQUIRED')),
  price: currency,
});

/** What the add-to-cart action accepts: the server looks up name, price and stock itself. */
export const addToCartSchema = z.object({ productId: idSchema });

export const insertCartSchema = z.object({
  items: z.array(cartItemSchema),
  itemsPrice: currency,
  totalPrice: currency,
  shippingPrice: currency,
  taxPrice: currency,
  sessionCartId: z.string().min(1, message('VALIDATION_CART_REQUIRED')),
  userId: z.string().optional().nullable(),
});


// Schema for the shipping address
export const shippingAddressSchema = z.object({
  fullName: z.string().min(3, message('VALIDATION_NAME_MIN')),
  streetAddress: z.string().min(3, message('VALIDATION_ADDRESS_MIN')),
  city: z.string().min(3, message('VALIDATION_CITY_MIN')),
  postalCode: z.string().min(3, message('VALIDATION_POSTAL_CODE_MIN')),
  country: z.string().min(3, message('VALIDATION_COUNTRY_MIN')),
  lat: z.number().optional(),
  lng: z.number().optional(),
});


// The shop's PAYMENT_METHODS and USER_ROLES come from server env, so the client forms only
// check the shape and the actions also check the value with these.
const oneOf = (allowed: readonly string[], key: TranslationKey) =>
  z.string().refine((value) => allowed.includes(value), message(key));

/** Server side: `allowedPaymentMethodSchema(PAYMENT_METHODS).parse(method)`. */
export const allowedPaymentMethodSchema = (methods: readonly string[]) =>
  oneOf(methods, 'VALIDATION_PAYMENT_METHOD_INVALID');

/** Server side: `userRoleSchema(USER_ROLES).parse(role)`. */
export const userRoleSchema = (roles: readonly string[]) => oneOf(roles, 'VALIDATION_ROLE_INVALID');

// Schema for payment method
export const paymentMethodSchema = z.object({
  type: z.string().min(1, message('VALIDATION_PAYMENT_METHOD_REQUIRED')),
});


  // Schema for inserting order
export const insertOrderSchema = z.object({
  userId: z.string().min(1, message('VALIDATION_USER_REQUIRED')),
  itemsPrice: currency,
  shippingPrice: currency,
  taxPrice: currency,
  totalPrice: currency,
  paymentMethod: z.string().min(1, message('VALIDATION_PAYMENT_METHOD_REQUIRED')),
  shippingAddress: shippingAddressSchema,
});

// Schema for inserting an order item
export const insertOrderItemSchema = z.object({
  productId: z.string(),
  slug: z.string(),
  image: z.string(),
  name: z.string(),
  price: currency,
  qty: z.number(),
});

// Schema for the PayPal paymentResult
export const paymentResultSchema = z.object({
  id: z.string(),
  status: z.string(),
  email_address: z.string(),
  pricePaid: z.string(),
});




// Schema for updating the user profile
export const updateProfileSchema = z.object({
  name: z.string().min(3, message('VALIDATION_NAME_MIN')),
  email: z.string().email(message('VALIDATION_EMAIL_INVALID')),
});


// Schema to update users (check the role with userRoleSchema on the server)
export const updateUserSchema = updateProfileSchema.extend({
  id: z.string().min(1, message('VALIDATION_ID_REQUIRED')),
  role: z.string().min(1, message('VALIDATION_ROLE_REQUIRED')),
});

// Schema to insert reviews
export const insertReviewSchema = z.object({
  title: z.string().min(3, message('VALIDATION_TITLE_MIN')),
  description: z.string().min(3, message('VALIDATION_DESCRIPTION_MIN')),
  productId: z.string().min(1, message('VALIDATION_PRODUCT_REQUIRED')),
  userId: z.string().min(1, message('VALIDATION_USER_REQUIRED')),
  rating: z.coerce
    .number()
    .int(message('VALIDATION_RATING_RANGE'))
    .min(1, message('VALIDATION_RATING_RANGE'))
    .max(5, message('VALIDATION_RATING_RANGE')),
});

export const SEARCH_SORT_ORDERS = ['newest', 'lowest', 'highest', 'rating'] as const;

// Search links are shared and edited by hand, so a bad value falls back instead of failing.
export const searchParamsSchema = z.object({
  q: z.string().trim().max(100).catch('all'),
  category: z.string().trim().max(100).catch('all'),
  price: z.string().regex(/^(all|\d+-\d+)$/).catch('all'),
  rating: z.string().regex(/^(all|[1-5])$/).catch('all'),
  sort: z.enum(SEARCH_SORT_ORDERS).catch('newest'),
  page: z.coerce.number().int().positive().catch(1),
});

export type SearchParams = z.infer<typeof searchParamsSchema>;

const RESERVE_CHANNELS = ['whatsapp', 'instagram', 'email', 'phone'] as const;
export type ReserveChannel = (typeof RESERVE_CHANNELS)[number];

// A reservation from the product page; guests add a name and how to reach them.
export const reserveRequestSchema = z.object({
  productId: idSchema,
  name: z.string().trim().max(60).optional(),
  channel: z.enum(RESERVE_CHANNELS).optional(),
  contact: z.string().trim().max(120).optional(),
  message: z.string().trim().max(500).optional(),
});

const isEmailList = (value: string) =>
  value.split(',').every((email) => !email.trim() || z.string().email().safeParse(email.trim()).success);

// How the owner hears about orders and interested customers (admin overview).
export const shopSettingsSchema = z
  .object({
    notifyEmail: z.boolean(),
    alertEmails: z.string().trim().max(500).refine(isEmailList, message('VALIDATION_EMAIL_INVALID')),
    notifyWhatsapp: z.boolean(),
    whatsappNumber: z.string().trim().max(30).regex(/^\+?[\d\s()-]*$/, message('VALIDATION_PHONE_INVALID')),
    whatsappApiKey: z.string().trim().max(100),
  })
  .refine((settings) => !settings.notifyWhatsapp || (settings.whatsappNumber && settings.whatsappApiKey), {
    message: message('VALIDATION_WHATSAPP_REQUIRED'),
    path: ['whatsappApiKey'],
  });

export type ShopSettingsInput = z.infer<typeof shopSettingsSchema>;

// Which contact details the website shows (admin overview).
export const contactVisibilitySchema = z.object({
  showEmail: z.boolean(),
  showPhone: z.boolean(),
  showInstagram: z.boolean(),
});

export type ContactVisibility = z.infer<typeof contactVisibilitySchema>;
