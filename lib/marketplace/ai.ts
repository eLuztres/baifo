import { z } from 'zod';
import { localize } from '@/lib/category';
import { PRODUCT_CONDITIONS } from '@/lib/constants';
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

const LANGUAGE_NAMES: Record<Locale, string> = { es: 'Spanish', en: 'English', it: 'Italian', de: 'German', fr: 'French' };

const textSchema = z.object({ title: z.string(), description: z.string() });

const listingSchema = z.object({
  texts: z.record(z.string(), textSchema),
  category: z.string(),
  condition: z.enum(PRODUCT_CONDITIONS),
  price: z.number().nullable(),
});

export type ListingText = z.infer<typeof listingSchema>;

// Strict structured output: every object lists all its properties as required and allows no others.
const textJsonSchema = {
  type: 'object',
  properties: { title: { type: 'string' }, description: { type: 'string' } },
  required: ['title', 'description'],
  additionalProperties: false,
};

const listingJsonSchema = (locales: Locale[], slugs: string[]) => ({
  type: 'object',
  properties: {
    texts: {
      type: 'object',
      properties: Object.fromEntries(locales.map((locale) => [locale, textJsonSchema])),
      required: locales,
      additionalProperties: false,
    },
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

/** A clean marketplace photo of the item, from the seller's photo. */
export const enhancePhoto = (photo: Buffer) => editImage(PHOTO_PROMPT, [photo], { size: '1024x1024' });

/** Title and description in every shop language, category, condition and price for a listing. */
export async function writeListing(photo: Buffer, sellerText: string, categories: ListingCategory[], locales: Locale[]): Promise<ListingText> {
  const slugs = categories.map((category) => category.slug);
  const result = listingSchema.parse(
    await draftText(photo, sellerText, null, {
      prompt: listingPrompt(sellerText, categories, locales),
      schema: listingJsonSchema(locales, slugs),
    })
  );
  // The enum already holds it to a slug; this also covers a category deleted while the AI worked.
  return slugs.includes(result.category) ? result : { ...result, category: FALLBACK_CATEGORY_SLUG };
}
