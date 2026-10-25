import { z } from 'zod';
import { PRODUCT_CONDITIONS } from '@/lib/constants';
import { draftText, editImage } from '@/lib/studio/openai.mjs';

// Keeps the seller's actual item: a used product must look like itself, wear included.
const PHOTO_PROMPT =
  'Turn this phone photo of a second-hand item into a clean marketplace photo. The item must stay IDENTICAL: same ' +
  'object, shape, colors, materials, wear and scratches; do not repair, add or remove anything on it. Remove the ' +
  'clutter around it and place it on a calm, warm sand-colored surface with a soft plain background, soft daylight ' +
  'and a gentle contact shadow. The whole item visible and centered, square photo, photorealistic. ' +
  'No hands, no people, no text, no logos, no watermark.';

const listingSchema = z.object({
  title: z.string(),
  descriptionEs: z.string(),
  descriptionEn: z.string(),
  category: z.string(),
  condition: z.enum(PRODUCT_CONDITIONS),
  price: z.number().nullable(),
});

export type ListingText = z.infer<typeof listingSchema>;

// OpenAI structured output needs every property listed as required.
const LISTING_JSON_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    descriptionEs: { type: 'string' },
    descriptionEn: { type: 'string' },
    category: { type: 'string' },
    condition: { type: 'string', enum: PRODUCT_CONDITIONS },
    price: { type: ['number', 'null'] },
  },
  required: ['title', 'descriptionEs', 'descriptionEn', 'category', 'condition', 'price'],
};

const listingPrompt = (sellerText: string, categories: string[]) =>
  'You write second-hand listings for Baifo, a local marketplace in Fuerteventura. Look at the item and return JSON:\n' +
  '- title: 2–6 words in Spanish, what the item is (brand and model only if visible or stated).\n' +
  '- descriptionEs: 2–4 short, friendly sentences in Spanish about the item and its visible condition. ' +
  'Never invent sizes, brands or defects that are not visible or stated.\n' +
  '- descriptionEn: the same description in English.\n' +
  (categories.length > 0
    ? `- category: exactly one of: ${categories.join(', ')}.\n`
    : '- category: one or two Spanish words for the kind of item, e.g. "Muebles".\n') +
  '- condition: exactly one of new (unused, with tags or in its box), like_new (used but no visible wear), good ' +
  '(normal signs of use), fair (clear wear, scratches or defects). Judge from the photo and what the seller wrote, and ' +
  'never rate it better than you can see.\n' +
  '- price: the price in euros the seller asked for, or a fair second-hand price for Fuerteventura if they named none.\n' +
  (sellerText ? `What the seller wrote (trust it): ${sellerText}\n` : 'The seller wrote nothing.\n');

/** A clean marketplace photo of the item, from the seller's photo. */
export const enhancePhoto = (photo: Buffer) => editImage(PHOTO_PROMPT, [photo], { size: '1024x1024' });

/** Title, descriptions, category and price for a listing. */
export async function writeListing(photo: Buffer, sellerText: string, categories: string[]): Promise<ListingText> {
  const result = await draftText(photo, sellerText, null, {
    prompt: listingPrompt(sellerText, categories),
    schema: LISTING_JSON_SCHEMA,
  });
  return listingSchema.parse(result);
}
