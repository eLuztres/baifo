import { z } from 'zod';
import { LOCALES, type Locale, type TranslationKey } from './i18n-core';
import { OFFER_ICONS } from './constants';
import { fromShopDateTime } from './event-date';
import { CLEAN_CONTACT, type ContactExtra } from './marketplace/contact-ways';

// Messages are translation keys (checked here at compile time); FormMessage and the Toaster
// translate them. No env-based config is imported, because client forms use these schemas too.
const message = (key: TranslationKey) => key;

/** Ids of products, orders and users (Postgres uuids), e.g. order ids and payment metadata. */
export const idSchema = z.string().uuid(message('VALIDATION_ID_INVALID'));

const groupTextSchema = (key: TranslationKey, max: number) =>
  z
    .record(z.string(), z.string().trim().max(max, message(key)))
    .refine((texts) => Object.values(texts).some(Boolean), message(key));

// A Mercadillo: its link name, name and text per language, picture and icon.
export const mercadilloSchema = z.object({
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, message('VALIDATION_SLUG_MIN')),
  name: groupTextSchema('VALIDATION_GROUP_NAME', 60),
  // Optional: a Mercadillo can be just a name.
  text: z.record(z.string(), z.string().trim().max(300, message('VALIDATION_GROUP_TEXT'))),
  image: z.string().nullable(),
  icon: z.string().nullable(),
  // Empty: no contact button.
  contactPhone: z
    .string()
    .trim()
    .regex(/^(\+?[\d\s]{9,20})?$/, message('VALIDATION_PHONE_INVALID')),
  // Its listings (products); missing: they stay as they are.
  productIds: z.array(z.string().uuid()).max(500).optional(),
});
export const updateMercadilloSchema = mercadilloSchema.extend({ id: idSchema });

// A señalador: a name, a photo and, to send them their link, a WhatsApp.
export const scoutSchema = z.object({
  image: z.string().url().startsWith('https://').nullish(),
  name: z.string().trim().min(1, message('VALIDATION_GROUP_NAME')).max(60, message('VALIDATION_GROUP_NAME')),
  phone: z
    .string()
    .trim()
    .regex(/^(\+?[\d\s]{9,20})?$/, message('VALIDATION_PHONE_INVALID')),
});
export const updateScoutSchema = scoutSchema.extend({ id: idSchema });

// Lowercased, so sign-in, sign-up and Google logins match the same account.
const emailSchema = z.string().trim().toLowerCase().email(message('VALIDATION_EMAIL_INVALID'));

// New passwords only: accounts from before keep signing in with their shorter ones.
export const PASSWORD_MIN_LENGTH = 10;

// Schema for signing users in
export const signInFormSchema = z.object({
  email: emailSchema,
  password: z.string().min(6, message('AUTH_INVALID_CREDENTIALS')),
});

// Schema for signing up a user
export const signUpFormSchema = z
  .object({
    name: z.string().min(3, message('VALIDATION_NAME_MIN')),
    email: emailSchema,
    password: z.string().min(PASSWORD_MIN_LENGTH, message('VALIDATION_PASSWORD_MIN')),
    confirmPassword: z.string().min(PASSWORD_MIN_LENGTH, message('VALIDATION_CONFIRM_PASSWORD_MIN')),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: message('VALIDATION_PASSWORDS_MISMATCH'),
    path: ['confirmPassword'],
  });

// The shop's USER_ROLES come from server env, so the client forms only
// check the shape and the actions also check the value with these.
const oneOf = (allowed: readonly string[], key: TranslationKey) =>
  z.string().refine((value) => allowed.includes(value), message(key));

/** Server side: `userRoleSchema(USER_ROLES).parse(role)`. */
export const userRoleSchema = (roles: readonly string[]) => oneOf(roles, 'VALIDATION_ROLE_INVALID');

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

// Who an invite link is for; only the admin sees it.
export const inviteNoteSchema = z.string().trim().max(80);

// Contact details belong in the Contact button only: a name with a link or a phone number is refused.
const NAME_LINK = /(https?:|www\.|@|\.(com|es|net|org|eu|io|me|ly|app|info|link|de|it|fr|uk)\b)/i;
const NAME_PHONE = /(\d\D?){5}/;

/** A seller's name or nickname on one listing; empty is null: no name. */
export const sellerNameSchema = z
  .string()
  .trim()
  .max(30)
  .refine((value) => !NAME_LINK.test(value) && !NAME_PHONE.test(value))
  .transform((value) => value || null);

// The person's WhatsApp as digits; empty: none (older listings, and clearing it in the editor).
// A leading 00 is the international prefix ("0034 612…"), written instead of +.
export const sellerPhoneSchema = z
  .string()
  .transform((value) => value.replace(/\D/g, '').replace(/^00/, ''))
  .refine((digits) => digits === '' || (digits.length >= 9 && digits.length <= 15));

const contactField = (kind: ContactExtra) =>
  z
    .string()
    .max(200)
    .transform((value, context) => {
      const clean = CLEAN_CONTACT[kind](value);
      if (clean === null) context.addIssue({ code: 'custom', message: `Invalid ${kind}` });
      return clean || null;
    });

// A listing's email, web page and Instagram besides the WhatsApp; empty: none.
export const listingContactsSchema = z.object({ email: contactField('email'), web: contactField('web'), instagram: contactField('instagram') });

/** The language buyers write to the seller in; empty is null, so the language of their number counts. */
export const sellerLocaleSchema = z
  .union([z.enum(LOCALES.map((option) => option.id) as [Locale, ...Locale[]]), z.literal('')])
  .transform((value) => value || null);

// A moment as the admin types it in a datetime-local input, on the shop's clock (SHOP_TIME_ZONE).
const shopDateTimeSchema = z.string().transform((value, context) => {
  const date = fromShopDateTime(value);
  if (date) return date;
  context.addIssue({ code: z.ZodIssueCode.custom, message: 'VALIDATION_OFFER_DATES' satisfies TranslationKey });
  return z.NEVER;
});

// An offer (admin "Offers"): its texts in the shop's language, translated on save; it shows only from startsAt to endsAt.
export const offerSchema = z
  .object({
    id: z.string().uuid().optional(),
    title: z.string().trim().min(2, 'VALIDATION_OFFER_TITLE' satisfies TranslationKey).max(80),
    text: z.string().trim().min(2, 'VALIDATION_OFFER_TEXT' satisfies TranslationKey).max(400),
    audience: z.string().trim().max(40),
    icon: z.enum(OFFER_ICONS),
    // A page of the shop ("/explore") or another site; empty means no button.
    linkUrl: z
      .string()
      .trim()
      .max(500)
      .refine((value) => value === '' || /^\/(?!\/)/.test(value) || value.startsWith('https://'), 'VALIDATION_OFFER_LINK' satisfies TranslationKey)
      .transform((value) => value || null),
    startsAt: shopDateTimeSchema,
    endsAt: shopDateTimeSchema,
    sortOrder: z.number().int().min(0).max(999),
    isActive: z.boolean(),
  })
  .refine(({ startsAt, endsAt }) => endsAt > startsAt, { message: 'VALIDATION_OFFER_DATES' satisfies TranslationKey, path: ['endsAt'] });

export type OfferInput = z.input<typeof offerSchema>;
