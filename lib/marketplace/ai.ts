import { z } from 'zod';
import { localize } from '@/lib/category';
import { PRODUCT_CONDITIONS, type ProductKind } from '@/lib/constants';
import type { Locale } from '@/lib/i18n-core';
import { draftText, editImage } from '@/lib/studio/openai.mjs';
import { FALLBACK_CATEGORY_SLUG, type ListingCategory } from './catalog';

// Keeps the seller's actual item: a used product must look like itself, wear included.
const PHOTO_PROMPT =
  'Turn this phone photo of a second-hand item into a clean marketplace photo. The item must stay IDENTICAL: same ' +
  'object, shape, colors, materials, wear and scratches; do not repair, add or remove anything on it. Remove the ' +
  'clutter around it and place it on a calm, warm sand-colored surface with a soft plain background, soft daylight ' +
  'and a gentle contact shadow. The whole item visible and centered, square photo, photorealistic. ' +
  'No hands, no people, no text, no logos, no watermark.';

// A service photo shows real people: they must stay exactly themselves, only the photo gets better.
const SERVICE_PHOTO_PROMPT =
  'Retouch this photo for a local services listing (a babysitter, gardener, teacher, therapist …). Every person must ' +
  'stay IDENTICAL: same face, features, age, body, skin, hair and clothes; do not beautify, slim or smooth anyone, and ' +
  'do not add or remove people. Keep the place and the work it shows, but make it look its best: warm natural ' +
  'daylight, balanced colors, sharp, straightened, distracting clutter at the edges tidied away. Calm, warm and ' +
  'friendly, with soft sand and sea tones like the rest of the shop. Square photo, photorealistic. Text that is ' +
  'already in the photo (a sign, a logo) stays readable as it is; add no text, logos or watermark.';

const LANGUAGE_NAMES: Record<Locale, string> = { es: 'Spanish', en: 'English', it: 'Italian', de: 'German', fr: 'French' };

const textSchema = z.object({ title: z.string(), description: z.string() });

const listingSchema = z.object({
  texts: z.record(z.string(), textSchema),
  category: z.string(),
  // A service has neither: the AI isn't asked for them.
  condition: z.enum(PRODUCT_CONDITIONS).nullable().default(null),
  price: z.number().nullable().default(null),
});

export type ListingText = z.infer<typeof listingSchema>;

// Strict structured output: every object lists all its properties as required and allows no others.
const textJsonSchema = {
  type: 'object',
  properties: { title: { type: 'string' }, description: { type: 'string' } },
  required: ['title', 'description'],
  additionalProperties: false,
};

const textsJsonSchema = (locales: Locale[]) => ({
  type: 'object',
  properties: Object.fromEntries(locales.map((locale) => [locale, textJsonSchema])),
  required: locales,
  additionalProperties: false,
});

const serviceJsonSchema = (locales: Locale[], slugs: string[]) => ({
  type: 'object',
  properties: { texts: textsJsonSchema(locales), category: { type: 'string', enum: slugs } },
  required: ['texts', 'category'],
});

const listingJsonSchema = (locales: Locale[], slugs: string[]) => ({
  type: 'object',
  properties: {
    texts: textsJsonSchema(locales),
    // An enum of the slugs: the AI can only answer with a category that exists.
    category: { type: 'string', enum: slugs },
    condition: { type: 'string', enum: PRODUCT_CONDITIONS },
    price: { type: ['number', 'null'] },
  },
  required: ['texts', 'category', 'condition', 'price'],
});

const categoryLine = ({ slug, name, keywords }: ListingCategory) =>
  `  - ${slug}: ${localize(name, 'es')} / ${localize(name, 'en')}` + (keywords.length > 0 ? ` (e.g. ${keywords.join(', ')})` : '');

const listingPrompt = (sellerText: string, categories: ListingCategory[], locales: Locale[]) =>
  'You write second-hand listings for Baifo, a local marketplace in Fuerteventura. Look at the item and return JSON:\n' +
  `- texts: for each of ${locales.map((locale) => `${locale} (${LANGUAGE_NAMES[locale]})`).join(', ')}: a title of 2–6 words ` +
  'naming what the item is (brand and model only if visible or stated), and a description of 2–4 short, friendly ' +
  'sentences about the item and its visible condition. The same facts in every language. Never invent sizes, brands ' +
  'or defects that are not visible or stated.\n' +
  '- category: the slug of the ONE store category a buyer would look in for this item. Decide by what the main ' +
  'item is, not by the background or the props around it. The categories:\n' +
  categories.map(categoryLine).join('\n') +
  `\n  Use ${FALLBACK_CATEGORY_SLUG} only if none of the others fits.\n` +
  '- condition: exactly one of new (unused, with tags or in its box), like_new (used but no visible wear), good ' +
  '(normal signs of use), fair (clear wear, scratches or defects). Judge from the photo and what the seller wrote, and ' +
  'never rate it better than you can see.\n' +
  '- price: the price in euros the seller asked for, or a fair second-hand price for Fuerteventura if they named none.\n' +
  (sellerText ? `What the seller wrote (trust it, it may name the item, condition, price and size): ${sellerText}\n` : 'The seller wrote nothing.\n');

const servicePrompt = (adminText: string, categories: ListingCategory[], locales: Locale[]) =>
  'You write service listings for Baifo, a local marketplace in Fuerteventura: a person offers a service (babysitting, ' +
  'gardening, lessons, help with paperwork …). Look at the photos and what the admin wrote, and return JSON:\n' +
  `- texts: for each of ${locales.map((locale) => `${locale} (${LANGUAGE_NAMES[locale]})`).join(', ')}: a title of 2–7 words ` +
  'with the person\'s first name (if stated) and the service, e.g. "Ana, canguro en Corralejo", and a description of ' +
  '2–4 short, friendly sentences: what they offer, where and when, languages, experience. The same facts in every ' +
  'language. Never mention a price, and never invent qualifications, places, times or experience that are not stated.\n' +
  '- category: the slug of the ONE kind of service a visitor would look in:\n' +
  categories.map(categoryLine).join('\n') +
  '\n' +
  (adminText ? `What the admin wrote about the person (trust it): ${adminText}\n` : 'The admin wrote nothing.\n');

/** A clean marketplace photo of the item, or a retouched photo of a service, from the original photo. */
export const enhancePhoto = (photo: Buffer, kind: ProductKind = 'product') =>
  editImage(kind === 'service' ? SERVICE_PHOTO_PROMPT : PHOTO_PROMPT, [photo], { size: '1024x1024' });

/** Title and description in every shop language and the category for a listing; an item also gets condition and price. */
export async function writeListing(
  photo: Buffer,
  sellerText: string,
  categories: ListingCategory[],
  locales: Locale[],
  kind: ProductKind = 'product'
): Promise<ListingText> {
  const slugs = categories.map((category) => category.slug);
  const isService = kind === 'service';
  const result = listingSchema.parse(
    await draftText(photo, sellerText, null, {
      prompt: isService ? servicePrompt(sellerText, categories, locales) : listingPrompt(sellerText, categories, locales),
      schema: isService ? serviceJsonSchema(locales, slugs) : listingJsonSchema(locales, slugs),
    })
  );
  // The enum already holds it to a slug; this also covers a category deleted while the AI worked.
  return slugs.includes(result.category) ? result : { ...result, category: isService ? slugs[0] : FALLBACK_CATEGORY_SLUG };
}
