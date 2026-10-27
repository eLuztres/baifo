import { z } from 'zod';
import { localize } from '@/lib/category';
import { PRODUCT_CONDITIONS, SERVICE_TYPES, type ListingType } from '@/lib/constants';
import { toShopDateTime } from '@/lib/event-date';
import type { Locale } from '@/lib/i18n-core';
import { draftText, editImage, generateImage } from '@/lib/ai-usage';
import { FALLBACK_CATEGORY_SLUG, type ListingCategory } from './catalog';

// Keeps the seller's actual item: a used product must look like itself, wear included.
const PHOTO_PROMPT =
  'Turn this phone photo of a second-hand item into a clean marketplace photo. The item must stay IDENTICAL: same ' +
  'object, shape, colors, materials, wear and scratches; do not repair, add or remove anything on it. Remove the ' +
  'clutter around it and place it on a calm, warm sand-colored surface with a soft plain background, soft daylight ' +
  'and a gentle contact shadow. The whole item visible and centered, upright 3:4 photo, photorealistic. ' +
  'No hands, no people, no text, no logos, no watermark.';

// A service photo shows real people: they must stay exactly themselves, only the photo gets better.
const SERVICE_PHOTO_PROMPT =
  'Retouch this photo for a local services listing (a babysitter, gardener, teacher, therapist …). Every person must ' +
  'stay IDENTICAL: same face, features, age, body, skin, hair and clothes; do not beautify, slim or smooth anyone, and ' +
  'do not add or remove people. Keep the place and the work it shows, but make it look its best: warm natural ' +
  'daylight, balanced colors, sharp, straightened, distracting clutter at the edges tidied away. Calm, warm and ' +
  'friendly, with soft sand and sea tones like the rest of the shop. Upright 3:4 photo, photorealistic. Text that is ' +
  'already in the photo (a sign, a logo) stays readable as it is; add no text, logos or watermark.';

const LANGUAGE_NAMES: Record<Locale, string> = { es: 'Spanish', en: 'English', it: 'Italian', de: 'German', fr: 'French' };

// Only a listing's texts have a short title.
const textSchema = z.object({ title: z.string(), description: z.string(), short: z.string().optional() });

// From a seller's words and photos the AI only tells an item for sale from a wanted ad; services and events are chosen by the admin.
const GOODS_TYPES = ['PRODUCT', 'WANTED'] as const satisfies readonly ListingType[];

const listingSchema = z.object({
  texts: z.record(z.string(), textSchema),
  category: z.string(),
  // Only asked for an item: whether it is for sale or wanted.
  type: z.enum(GOODS_TYPES).nullable().default(null),
  // A service has neither: the AI isn't asked for them.
  condition: z.enum(PRODUCT_CONDITIONS).nullable().default(null),
  price: z.number().nullable().default(null),
  // Only a wanted ad's budget has an upper end.
  priceMax: z.number().nullable().default(null),
  // Only asked when the shop has more than one live place.
  place: z.string().nullable().default(null),
  // Only a service's kind of offer, and an event's start ("2026-11-29T19:00" on the island) and address.
  serviceType: z.enum(SERVICE_TYPES).nullable().default(null),
  startsAt: z.string().nullable().default(null),
  address: z.string().nullable().default(null),
});

export type ListingText = z.infer<typeof listingSchema>;

// Strict structured output: every object lists all its properties as required and allows no others.
const textJsonSchema = {
  type: 'object',
  properties: { title: { type: 'string' }, description: { type: 'string' } },
  required: ['title', 'description'],
  additionalProperties: false,
};

const listingTextJsonSchema = {
  type: 'object',
  properties: { title: { type: 'string' }, description: { type: 'string' }, short: { type: 'string' } },
  required: ['title', 'description', 'short'],
  additionalProperties: false,
};

const textsJsonSchema = (locales: Locale[], text: object = textJsonSchema) => ({
  type: 'object',
  properties: Object.fromEntries(locales.map((locale) => [locale, text])),
  required: locales,
  additionalProperties: false,
});

const serviceJsonSchema = (locales: Locale[], slugs: string[]) => ({
  type: 'object',
  properties: {
    texts: textsJsonSchema(locales, listingTextJsonSchema),
    category: { type: 'string', enum: slugs },
    serviceType: { type: 'string', enum: SERVICE_TYPES },
    price: { type: ['number', 'null'] },
  },
  required: ['texts', 'category', 'serviceType', 'price'],
});

const eventJsonSchema = (locales: Locale[], slugs: string[]) => ({
  type: 'object',
  properties: {
    texts: textsJsonSchema(locales, listingTextJsonSchema),
    category: { type: 'string', enum: slugs },
    price: { type: ['number', 'null'] },
    startsAt: { type: ['string', 'null'] },
    address: { type: ['string', 'null'] },
  },
  required: ['texts', 'category', 'price', 'startsAt', 'address'],
});

const listingJsonSchema = (locales: Locale[], slugs: string[]) => ({
  type: 'object',
  properties: {
    texts: textsJsonSchema(locales, listingTextJsonSchema),
    // An enum of the slugs: the AI can only answer with a category that exists.
    category: { type: 'string', enum: slugs },
    type: { type: 'string', enum: GOODS_TYPES },
    condition: { type: 'string', enum: PRODUCT_CONDITIONS },
    price: { type: ['number', 'null'] },
    priceMax: { type: ['number', 'null'] },
  },
  required: ['texts', 'category', 'type', 'condition', 'price', 'priceMax'],
});

/** A live place a listing can be in, as the AI reads it from the text. */
export interface ListingPlace {
  slug: string;
  name: string;
}

// With one live place there's nothing to choose, so the AI isn't asked.
const withPlace = <T extends { properties: object; required: string[] }>(schema: T, places: ListingPlace[]) =>
  places.length < 2
    ? schema
    : { ...schema, properties: { ...schema.properties, place: { type: 'string', enum: places.map(({ slug }) => slug) } }, required: [...schema.required, 'place'] };

const placeRule = (places: ListingPlace[]) =>
  places.length < 2
    ? ''
    : '- place: the slug of the town where the thing is handed over or the service is offered, as written; if no town ' +
      `is named, ${places[0].slug}. The towns: ${places.map(({ slug, name }) => `${slug} (${name})`).join(', ')}.\n`;

const categoryLine = ({ slug, name, keywords }: ListingCategory) =>
  `  - ${slug}: ${localize(name, 'es')} / ${localize(name, 'en')}` + (keywords.length > 0 ? ` (e.g. ${keywords.join(', ')})` : '');

// The store's ring row has room for a word or three, not a whole title.
const SHORT_RULE =
  '- short (in every text): the title cut down to 1–3 words, at most 20 characters, naming what it is, e.g. ' +
  '"Boss RC-500", "Cables", "Apple Watch Ultra", "Ana, canguro", "Busco surf".\n';

// The same list for every type: any listing goes in any category.
const categoryRule = (what: string, categories: ListingCategory[]) =>
  `- category: the slug of the ONE category a visitor would look in for ${what}. The categories:\n` +
  categories.map(categoryLine).join('\n') +
  `\n  Use ${FALLBACK_CATEGORY_SLUG} only if none of the others fits.\n`;

const WANTED_RULE =
  '- type: WANTED if the person is LOOKING FOR something (busco, estoy buscando, looking for, cerco, suche …) instead ' +
  'of selling it, else PRODUCT. A WANTED ad is different: the photo only shows what they want, the title says so (e.g. "Busco tabla de surf", ' +
  '"Looking for a surfboard"), the description says what they need and when, condition is the worst they accept ' +
  '(good if unsaid, any if they take it in any condition), price and priceMax are the lowest and highest end of their budget (if they name one amount, ' +
  'that is priceMax and price is a fair lower end; if they name none, a fair second-hand range), and category is where the wanted thing would be found.\n';

const listingPrompt = (sellerText: string, categories: ListingCategory[], locales: Locale[]) =>
  'You write second-hand listings for Baifo, a local marketplace in Fuerteventura. Look at the item and return JSON:\n' +
  `- texts: for each of ${locales.map((locale) => `${locale} (${LANGUAGE_NAMES[locale]})`).join(', ')}: a title of 2–6 words ` +
  'naming what the item is (brand and model only if visible or stated), and a description of 2–4 short, friendly ' +
  'sentences about the item and its visible condition. The same facts in every language. Never invent sizes, brands ' +
  'or defects that are not visible or stated.\n' +
  SHORT_RULE +
  categoryRule('this item (decide by what the main item is, not by the background or the props around it)', categories) +
  WANTED_RULE +
  '- condition: for an item for sale exactly one of new (unused, with tags or in its box), like_new (used but no visible wear), good ' +
  '(normal signs of use), fair (clear wear, scratches or defects). Judge from the photo and what the seller wrote, and ' +
  'never rate it better than you can see.\n' +
  '- price: the price in euros the seller asked for, or a fair second-hand price for Fuerteventura if they named none.\n' +
  '- priceMax: null, except for a wanted ad.\n' +
  (sellerText ? `What the seller wrote (trust it, it may name the item, condition, price and size): ${sellerText}\n` : 'The seller wrote nothing.\n');

const servicePrompt = (adminText: string, categories: ListingCategory[], locales: Locale[]) =>
  'You write service listings for Baifo, a local marketplace in Fuerteventura: a person offers a service (babysitting, ' +
  'gardening, lessons, help with paperwork …). Look at the photos and what the admin wrote, and return JSON:\n' +
  `- texts: for each of ${locales.map((locale) => `${locale} (${LANGUAGE_NAMES[locale]})`).join(', ')}: a title of 2–7 words ` +
  'with the person\'s first name (if stated) and the service, e.g. "Ana, canguro en Corralejo", and a description of ' +
  '2–4 short, friendly sentences: what they offer, where and when, languages, experience. The same facts in every ' +
  'language. Never mention a price in the texts, and never invent qualifications, places, times or experience that are not stated.\n' +
  SHORT_RULE +
  categoryRule('this service', categories) +
  '- serviceType: class (lessons, courses, teaching), support (someone who goes along with or looks after a person: ' +
  'company, care, accompaniment) or service (work done for you; anything else).\n' +
  '- price: the lowest price in euros the admin named (it is shown as "from"), or null if none is named. Never guess one.\n' +
  (adminText ? `What the admin wrote about the person (trust it): ${adminText}\n` : 'The admin wrote nothing.\n');

const eventPrompt = (adminText: string, categories: ListingCategory[], locales: Locale[]) =>
  'You write event listings for Baifo, a local marketplace in Fuerteventura: an event or workshop (a dance class, a ' +
  'concert, a market …). Look at the poster or photo and what the admin wrote, and return JSON:\n' +
  `- texts: for each of ${locales.map((locale) => `${locale} (${LANGUAGE_NAMES[locale]})`).join(', ')}: a title of 2–7 words ` +
  'naming the event, and a description of 2–4 short, friendly sentences: what it is, for whom, what to bring. The same ' +
  'facts in every language. Never invent times, places, prices or names that are not stated.\n' +
  SHORT_RULE +
  categoryRule('this event', categories) +
  '- price: the entry or ticket price in euros, 0 if it is free, null if not stated.\n' +
  `- startsAt: when it starts, as YYYY-MM-DDTHH:mm in local time, or null if no date is stated. Today is ${toShopDateTime(new Date())}; ` +
  'a weekday without a date is the next one.\n' +
  '- address: where it is (venue, street, town), as stated, or null.\n' +
  (adminText ? `What the admin wrote about the event (trust it): ${adminText}\n` : 'The admin wrote nothing.\n');

/** The admin's own words, used as they are: the AI only translates them, and names a missing title. */
export interface KeptText {
  title?: string;
  description: string;
}

// Added after the usual prompt, so category, condition and price are still read from the text.
const keptTextRule = (kept: KeptText, locales: Locale[]) =>
  `IMPORTANT: the admin wants their own words, so the texts rule above does not apply. In ${locales[0]}, the ` +
  (kept.title ? `title is exactly "${kept.title}"` : 'title is 2–6 words taken from their text') +
  ' and the description is exactly their text, word for word. Every other language gets a faithful translation of ' +
  'that title and description, adding and leaving out nothing.\n';

// Added when the admin started the listing as "Busco": the wanted rule above is the one that applies.
const WANTED_ONLY_RULE = 'IMPORTANT: this IS a wanted ad (type WANTED), follow the WANTED rule for texts, condition, price and category.\n';

// Without a photo, everything comes from the words; the picture is made from the text afterwards.
const NO_PHOTO_RULE =
  'There is no photo: take everything from what was written. Never describe a look, color or condition that is not stated; ' +
  'condition is good if unsaid.\n';

const translatePrompt = (from: Locale, locales: Locale[]) =>
  `Translate this listing's title and description from ${LANGUAGE_NAMES[from]} into ` +
  `${locales.map((locale) => `${locale} (${LANGUAGE_NAMES[locale]})`).join(', ')}. Translate faithfully and naturally, ` +
  'keep the tone, add and leave out nothing, and keep names, places and numbers as they are. Return JSON with texts.\n';

// Upright like a phone photo, so it fills the feed's 3:4 tiles; nobody posts square pictures any more.
const LISTING_PHOTO_SIZE = '1152x1536';

/** A clean marketplace photo of the item, or a retouched photo of a service, from the original photo. */
export const enhancePhoto = (photo: Buffer, type: ListingType = 'PRODUCT') =>
  editImage(type === 'PRODUCT' || type === 'WANTED' ? PHOTO_PROMPT : SERVICE_PHOTO_PROMPT, [photo], { size: LISTING_PHOTO_SIZE });

// The shop's look for a picture made from words alone, so it sits well next to the retouched photos.
const PICTURE_STYLE =
  'Upright 3:4 photo, photorealistic, soft warm daylight, calm sand and sea tones like a local Fuerteventura marketplace. ' +
  'No text, no logos, no watermark.';

const picturePrompt = ({ title, description }: { title: string; description: string }, type: ListingType) =>
  (type === 'EVENT'
    ? 'An inviting photo of this event or workshop happening in Fuerteventura. People only from behind, from afar or ' +
      'as hands, never a recognisable face. '
    : type === 'SERVICE'
      ? 'A friendly photo that shows this local service being done in Fuerteventura. People only from behind, from afar or ' +
        'as hands at work, never a recognisable face, because it is not the real person. '
      : type === 'WANTED'
        ? 'A clean photo of the kind of thing someone is looking for, alone on a warm sand-colored surface with a soft plain ' +
          'background, as an example of what they want. '
        : 'A clean marketplace photo of this second-hand item, alone on a warm sand-colored surface with a soft plain ' +
          'background and a gentle contact shadow, the whole item visible and centered. ') +
  `${PICTURE_STYLE}\nThe listing: ${title}. ${description}`;

/** A picture made from the listing's text alone, for a listing without any photo. */
export const createPicture = (text: { title: string; description: string }, type: ListingType = 'PRODUCT') =>
  generateImage(picturePrompt(text, type), { size: LISTING_PHOTO_SIZE });

/** Title and description in every shop language (the first one is the shop's), the category and the type for a listing;
    an item also gets condition and price. With `kept`, the admin's own text stays as it is and is only translated.
    Without a photo the AI goes by the text alone. A PRODUCT may come back as WANTED (someone looking for it); the
    other types stay as the admin chose them. With several live `places`, it also names the town. */
export async function writeListing(
  photo: Buffer | null,
  sellerText: string,
  categories: ListingCategory[],
  locales: Locale[],
  type: ListingType = 'PRODUCT',
  kept?: KeptText,
  places: ListingPlace[] = []
): Promise<Omit<ListingText, 'type'> & { type: ListingType }> {
  const slugs = categories.map((category) => category.slug);
  const isService = type === 'SERVICE';
  const isEvent = type === 'EVENT';
  const prompt =
    (isService
      ? servicePrompt(sellerText, categories, locales)
      : isEvent
        ? eventPrompt(sellerText, categories, locales)
        : listingPrompt(sellerText, categories, locales)) +
    (type === 'WANTED' ? WANTED_ONLY_RULE : '') +
    (photo ? '' : NO_PHOTO_RULE) +
    placeRule(places);
  const result = listingSchema.parse(
    await draftText(photo, sellerText, null, {
      prompt: kept ? prompt + keptTextRule(kept, locales) : prompt,
      schema: withPlace(
        isService ? serviceJsonSchema(locales, slugs) : isEvent ? eventJsonSchema(locales, slugs) : listingJsonSchema(locales, slugs),
        places
      ),
    })
  );
  // The AI may still tidy the admin's words; their own text wins.
  if (kept) {
    const own = result.texts[locales[0]];
    result.texts[locales[0]] = { title: kept.title || own?.title || '', description: kept.description, short: own?.short };
  }
  const resolvedType = type === 'PRODUCT' && result.type === 'WANTED' ? 'WANTED' : type;
  // The enum already holds it to a slug; this also covers a category deleted while the AI worked.
  const category = slugs.includes(result.category) ? result.category : slugs.includes(FALLBACK_CATEGORY_SLUG) ? FALLBACK_CATEGORY_SLUG : slugs[0];
  return { ...result, category, type: resolvedType };
}

const categoryTextPrompt = (locales: Locale[]) =>
  'Write the description of a category of Baifo, a local marketplace in Fuerteventura, from what the admin wrote. ' +
  `For each of ${locales.map((locale) => `${locale} (${LANGUAGE_NAMES[locale]})`).join(', ')}: the title is the category ` +
  `name (in ${locales[0]} exactly as the admin wrote it, translated naturally for the others) and the description is one ` +
  'or two short, inviting sentences, at most 200 characters, telling visitors what they find in it. The same facts in ' +
  'every language; never invent brands, places or offers that are not stated. Return JSON with texts.\n';

/** A category's name and an inviting description in every shop language (its own first), from the admin's notes. */
export async function writeCategoryText(text: { title: string; description: string }, locales: Locale[]) {
  const result = await draftText(null, '', null, {
    prompt: categoryTextPrompt(locales) + `Name: ${text.title}\nWhat the admin wrote: ${text.description || '(nothing)'}\n`,
    schema: { type: 'object', properties: { texts: textsJsonSchema(locales) }, required: ['texts'] },
  });
  return z.object({ texts: z.record(z.string(), textSchema) }).parse(result).texts as Partial<Record<Locale, z.infer<typeof textSchema>>>;
}

/** The same title and description (and a listing's short title) in other languages, translated, not rewritten. */
export async function translateText(text: { title: string; description: string; short?: string }, from: Locale, locales: Locale[]) {
  if (locales.length === 0) return {};
  const hasShort = text.short !== undefined;
  const result = await draftText(null, '', null, {
    prompt:
      translatePrompt(from, locales) +
      `Title: ${text.title}\nDescription: ${text.description}\n` +
      (hasShort ? `Short title (keep it 1–3 words): ${text.short || text.title}\n` : ''),
    schema: { type: 'object', properties: { texts: textsJsonSchema(locales, hasShort ? listingTextJsonSchema : textJsonSchema) }, required: ['texts'] },
  });
  return z.object({ texts: z.record(z.string(), textSchema) }).parse(result).texts as Partial<Record<Locale, z.infer<typeof textSchema>>>;
}
