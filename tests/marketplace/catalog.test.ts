import { allCategoryRefs, categoryRefs, findCategories, findCategory, toProductTranslations } from '@/lib/marketplace/catalog';
import { correctText, translateText, writeListing } from '@/lib/marketplace/ai';
import { draftText } from '@/lib/studio/openai.mjs';

jest.mock('@/db/prisma', () => ({ prisma: {} }));
jest.mock('@/lib/studio/openai.mjs', () => ({ draftText: jest.fn(), editImage: jest.fn(), onUsage: jest.fn() }));
jest.mock('@/lib/studio/prompts.mjs', () => ({ seedOf: () => 0 }));

const draft = draftText as jest.Mock;

const CATEGORIES = [
  { id: 'c1', slug: 'motor', name: { es: 'Bicis y motor', en: 'Bikes and vehicles' }, keywords: ['bicicleta', 'patinete'], parentId: null, parent: null },
  { id: 'c2', slug: 'hogar', name: { es: 'Hogar, objetos y jardín', en: 'Home, things and garden' }, keywords: [], parentId: null, parent: null },
];

// One list for every type: a service can go in Motor, an item in Clases.
const ALL_CATEGORIES = [
  ...CATEGORIES,
  { id: 's2', slug: 'clases', name: { es: 'Clases', en: 'Lessons' }, keywords: [], parentId: null, parent: null },
];

const TEXTS = { es: { title: 'Bici de paseo', description: 'Bici cómoda.' }, en: { title: 'City bike', description: 'Comfy bike.' } };

describe('findCategory', () => {
  it('finds a category by slug or by its name in any language, ignoring case', () => {
    expect(findCategory(CATEGORIES, 'motor')?.id).toBe('c1');
    expect(findCategory(CATEGORIES, 'Bicis y motor')?.id).toBe('c1');
    expect(findCategory(CATEGORIES, 'bikes and vehicles ')?.id).toBe('c1');
  });

  it('finds nothing for an unknown or empty value', () => {
    expect(findCategory(CATEGORIES, 'Muebles')).toBeUndefined();
    expect(findCategory(CATEGORIES, null)).toBeUndefined();
  });
});

describe('toProductTranslations', () => {
  it('turns listing titles into product names', () => {
    expect(toProductTranslations({ en: { title: 'City bike', description: 'Comfy bike.' } })).toEqual({
      en: { name: 'City bike', description: 'Comfy bike.' },
    });
  });
});

describe('writeListing', () => {
  beforeEach(() => draft.mockReset());

  it('lets the AI answer only with a store category and every shop language', async () => {
    draft.mockResolvedValue({ texts: TEXTS, category: 'motor', condition: 'good', price: 80 });

    const listing = await writeListing(Buffer.from(''), 'bici, 80€', CATEGORIES, ['es', 'en']);

    expect(listing.category).toBe('motor');
    const { prompt, schema } = draft.mock.calls[0][3];
    expect(schema.properties.category.enum).toEqual(['motor', 'hogar']);
    expect(schema.properties.texts.required).toEqual(['es', 'en']);
    expect(prompt).toContain('motor: Bicis y motor / Bikes and vehicles (e.g. bicicleta, patinete)');
  });

  it('writes every type from the seller\'s words, without analysing the photo or judging the item', async () => {
    for (const type of ['PRODUCT', 'SERVICE', 'EVENT'] as const) {
      draft.mockReset();
      draft.mockResolvedValue({ texts: TEXTS, category: 'motor', condition: 'good', price: 80 });
      await writeListing(Buffer.from(''), 'bici, 80€', CATEGORIES, ['es', 'en'], type);

      const { prompt } = draft.mock.calls[0][3];
      expect(prompt).toContain('build them from what was written');
      expect(prompt).toContain('Never describe or analyse the photo');
      expect(prompt).toContain('Never judge its condition or say anything negative about it');
      expect(prompt).not.toContain('visible condition');
      if (type !== 'EVENT') expect(prompt).toContain('The texts never mention the price');
    }
  });

  it('only names the item neutrally when the seller wrote nothing', async () => {
    draft.mockResolvedValue({ texts: TEXTS, category: 'motor', condition: 'good', price: 80 });

    await writeListing(Buffer.from(''), '', CATEGORIES, ['es', 'en']);

    const { prompt } = draft.mock.calls[0][3];
    expect(prompt).toContain('The seller wrote nothing.');
    expect(prompt).toContain('only say neutrally and briefly what it is');
    expect(prompt).toContain('Never judge its condition');
  });

  it('lets the AI tell an item for sale, a service and a wanted ad apart, with how its price reads', async () => {
    draft.mockResolvedValue({ texts: TEXTS, category: 'motor', type: 'WANTED', price: 90, priceMode: 'UP_TO' });

    const listing = await writeListing(Buffer.from(''), 'busco bici, hasta 90€', CATEGORIES, ['es', 'en']);

    expect(listing).toMatchObject({ category: 'motor', type: 'WANTED', price: 90, priceMode: 'UP_TO' });
    const { prompt, schema } = draft.mock.calls[0][3];
    expect(schema.properties.type.enum).toEqual(['PRODUCT', 'SERVICE', 'WANTED']);
    expect(schema.properties.priceMode.enum).toEqual(['NONE', 'FIXED', 'FROM', 'UP_TO']);
    expect(schema.required).toEqual(expect.arrayContaining(['type', 'price', 'priceMode']));
    expect(schema.properties).not.toHaveProperty('condition');
    expect(prompt).toContain('WANTED if the person is LOOKING FOR a thing or someone');

    draft.mockResolvedValue({ texts: TEXTS, category: 'hogar', type: 'SERVICE', price: 20, priceMode: 'FROM' });
    expect(await writeListing(Buffer.from(''), 'Ana, clases de guitarra desde 20€', CATEGORIES, ['es', 'en'])).toMatchObject({ type: 'SERVICE', priceMode: 'FROM' });
  });

  it('keeps a type the admin chose, whatever the AI answers', async () => {
    draft.mockResolvedValue({ texts: TEXTS, category: 'motor', type: 'PRODUCT', condition: 'good', price: 50 });
    expect((await writeListing(Buffer.from(''), 'tabla', CATEGORIES, ['es', 'en'], 'WANTED')).type).toBe('WANTED');
    expect(draft.mock.calls[0][3].prompt).toContain('this IS a wanted ad');

    draft.mockResolvedValue({ texts: TEXTS, category: 'motor', type: 'PRODUCT', price: null, priceMode: 'NONE' });
    expect((await writeListing(Buffer.from(''), 'taller de bicis', CATEGORIES, ['es', 'en'], 'SERVICE')).type).toBe('SERVICE');
  });

  it('is an item for sale when the AI says nothing about the type', async () => {
    draft.mockResolvedValue({ texts: TEXTS, category: 'motor', condition: 'good', price: 80 });
    expect((await writeListing(Buffer.from(''), 'bici', CATEGORIES, ['es', 'en'])).type).toBe('PRODUCT');
  });

  it('puts a listing in "hogar" when the category no longer exists', async () => {
    draft.mockResolvedValue({ texts: TEXTS, category: 'muebles', condition: 'good', price: null });

    expect((await writeListing(Buffer.from(''), '', CATEGORIES, ['es', 'en'])).category).toBe('hogar');
  });

  it('asks a service only for its price and how it reads, never guessed', async () => {
    draft.mockResolvedValue({ texts: TEXTS, category: 'clases', price: 20, priceMode: 'FROM' });

    const listing = await writeListing(Buffer.from(''), 'Ana, clases de guitarra desde 20€', ALL_CATEGORIES, ['es', 'en'], 'SERVICE');

    expect(listing).toMatchObject({ category: 'clases', price: 20, priceMode: 'FROM', type: 'SERVICE' });
    const { prompt, schema } = draft.mock.calls[0][3];
    expect(schema.required).toEqual(['texts', 'category', 'price', 'priceMode']);
    expect(schema.properties.category.enum).toEqual(['motor', 'hogar', 'clases']);
    expect(prompt).toContain('never guessed');
  });

  it('reads an event\'s entry price, start and address, and sorts it into any category', async () => {
    draft.mockResolvedValue({ texts: TEXTS, category: 'clases', price: 0, startsAt: '2026-11-26T19:00', address: 'Plaza de Lajares' });

    const listing = await writeListing(Buffer.from(''), 'Bachata gratis el jueves a las 19h en la plaza de Lajares', ALL_CATEGORIES, ['es', 'en'], 'EVENT');

    expect(listing).toMatchObject({ category: 'clases', price: 0, startsAt: '2026-11-26T19:00', address: 'Plaza de Lajares', type: 'EVENT' });
    const { prompt, schema } = draft.mock.calls[0][3];
    expect(schema.required).toEqual(['texts', 'category', 'price', 'startsAt', 'address']);
    expect(prompt).toContain('Today is');
    expect(prompt).toContain('clases: Clases / Lessons');
  });

  it('puts a service in "hogar" too when its category no longer exists', async () => {
    draft.mockResolvedValue({ texts: TEXTS, category: 'jardineria' });

    expect((await writeListing(Buffer.from(''), '', ALL_CATEGORIES, ['es', 'en'], 'SERVICE')).category).toBe('hogar');
  });
});

describe('writeListing with the admin\'s own text', () => {
  beforeEach(() => draft.mockReset());

  it('keeps title and description word for word in the shop language and only translates them', async () => {
    // The AI tidied the words anyway; the admin's own text must win.
    draft.mockResolvedValue({ texts: { es: { title: 'Bici', description: 'Bici muy cómoda.' }, en: TEXTS.en }, category: 'motor', condition: 'good', price: 80 });

    const listing = await writeListing(Buffer.from(''), 'bici comoda 80€', CATEGORIES, ['es', 'en'], 'PRODUCT', { title: 'Mi bici', description: 'bici comoda 80€' });

    expect(listing.texts.es).toEqual({ title: 'Mi bici', description: 'bici comoda 80€' });
    expect(listing.texts.en).toEqual(TEXTS.en);
    expect(listing).toMatchObject({ category: 'motor', price: 80 });
    expect(draft.mock.calls[0][3].prompt).toContain('title is exactly "Mi bici"');
  });

  it('lets the AI name the title when the admin gave none', async () => {
    draft.mockResolvedValue({ texts: TEXTS, category: 'motor', condition: 'good', price: null });

    const listing = await writeListing(Buffer.from(''), 'bici comoda', CATEGORIES, ['es', 'en'], 'PRODUCT', { description: 'bici comoda' });

    expect(listing.texts.es).toEqual({ title: 'Bici de paseo', description: 'bici comoda' });
  });
});

describe('writeListing with the admin\'s own text, only corrected', () => {
  beforeEach(() => draft.mockReset());

  it('keeps the AI\'s corrected words and asks it only to fix mistakes', async () => {
    const corrected = { title: 'Mi bici', description: 'Bici cómoda, 80 €.' };
    draft.mockResolvedValue({ texts: { es: corrected, en: TEXTS.en }, category: 'motor', condition: 'good', price: 80 });

    const listing = await writeListing(Buffer.from(''), 'bici comoda 80€', CATEGORIES, ['es', 'en'], 'PRODUCT', {
      title: 'Mi bici',
      description: 'bici comoda 80€',
      isCorrected: true,
    });

    expect(listing.texts.es).toEqual(corrected);
    expect(draft.mock.calls[0][3].prompt).toContain('only its spelling, grammar and punctuation mistakes fixed');
  });
});

describe('correctText', () => {
  beforeEach(() => draft.mockReset());

  it('corrects the shop-language text and translates it in one go', async () => {
    draft.mockResolvedValue({ texts: TEXTS });

    expect(await correctText({ title: 'Bici', description: 'bici comoda' }, 'es', ['en'])).toEqual(TEXTS);
    const [photo, , , { prompt, schema }] = draft.mock.calls[0];
    expect(photo).toBeNull();
    expect(prompt).toContain('bici comoda');
    expect(schema.properties.texts.required).toEqual(['es', 'en']);
  });
});

describe('translateText', () => {
  beforeEach(() => draft.mockReset());

  it('translates one text into the other languages without a photo', async () => {
    draft.mockResolvedValue({ texts: { en: TEXTS.en } });

    expect(await translateText(TEXTS.es, 'es', ['en'])).toEqual({ en: TEXTS.en });
    const [photo, , , { prompt, schema }] = draft.mock.calls[0];
    expect(photo).toBeNull();
    expect(prompt).toContain('Bici cómoda.');
    expect(schema.properties.texts.required).toEqual(['en']);
  });

  it('asks nothing when the shop has no other language', async () => {
    expect(await translateText(TEXTS.es, 'es', [])).toEqual({});
    expect(draft).not.toHaveBeenCalled();
  });
});

describe('several categories', () => {
  it("finds them in the shop's order and drops the unknown", () => {
    const shop = [{ slug: 'hogar', name: {} }, { slug: 'ocio', name: {} }, { slug: 'cultura', name: {} }];
    expect(findCategories(shop, ['cultura', 'gone', 'hogar']).map((category) => category.slug)).toEqual(['hogar', 'cultura']);
  });

  it('links a parent once, even when it and its subcategory are both chosen', () => {
    expect(allCategoryRefs([{ id: 'p1', parentId: null }, { id: 's1', parentId: 'p1' }])).toEqual([{ id: 'p1' }, { id: 's1' }]);
  });
});

describe('categoryRefs', () => {
  it('links a subcategory to its parent too, a store category only to itself', () => {
    expect(categoryRefs({ id: 's1', parentId: 'p1' })).toEqual([{ id: 's1' }, { id: 'p1' }]);
    expect(categoryRefs({ id: 'c1', parentId: null })).toEqual([{ id: 'c1' }]);
  });
});
