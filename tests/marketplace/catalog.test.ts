import { toProductTranslations } from '@/lib/marketplace/catalog';
import { correctText, translateText, writeListing } from '@/lib/marketplace/ai';
import { draftText } from '@/lib/studio/openai.mjs';

jest.mock('@/db/prisma', () => ({ prisma: {} }));
jest.mock('@/lib/studio/openai.mjs', () => ({ draftText: jest.fn(), editImage: jest.fn(), onUsage: jest.fn() }));
jest.mock('@/lib/studio/prompts.mjs', () => ({ seedOf: () => 0 }));

const draft = draftText as jest.Mock;

const TEXTS = { es: { title: 'Bici de paseo', description: 'Bici cómoda.' }, en: { title: 'City bike', description: 'Comfy bike.' } };

describe('toProductTranslations', () => {
  it('turns listing titles into product names', () => {
    expect(toProductTranslations({ en: { title: 'City bike', description: 'Comfy bike.' } })).toEqual({
      en: { name: 'City bike', description: 'Comfy bike.' },
    });
  });
});

describe('writeListing', () => {
  beforeEach(() => draft.mockReset());

  it('asks the AI for every shop language and no category', async () => {
    draft.mockResolvedValue({ texts: TEXTS, condition: 'good', price: 80 });

    await writeListing(Buffer.from(''), 'bici, 80€', ['es', 'en']);

    const { prompt, schema } = draft.mock.calls[0][3];
    expect(schema.properties.texts.required).toEqual(['es', 'en']);
    expect(schema.properties).not.toHaveProperty('category');
    expect(prompt).not.toContain('category');
  });

  it('writes every type from the seller\'s words, without analysing the photo or judging the item', async () => {
    for (const type of ['PRODUCT', 'SERVICE', 'EVENT'] as const) {
      draft.mockReset();
      draft.mockResolvedValue({ texts: TEXTS, condition: 'good', price: 80 });
      await writeListing(Buffer.from(''), 'bici, 80€', ['es', 'en'], type);

      const { prompt } = draft.mock.calls[0][3];
      expect(prompt).toContain('build them from what was written');
      expect(prompt).toContain('Never describe or analyse the photo');
      expect(prompt).toContain('Never judge its condition or say anything negative about it');
      expect(prompt).not.toContain('visible condition');
      if (type !== 'EVENT') expect(prompt).toContain('The texts never mention the price');
    }
  });

  it('only names the item neutrally when the seller wrote nothing', async () => {
    draft.mockResolvedValue({ texts: TEXTS, condition: 'good', price: 80 });

    await writeListing(Buffer.from(''), '', ['es', 'en']);

    const { prompt } = draft.mock.calls[0][3];
    expect(prompt).toContain('The seller wrote nothing.');
    expect(prompt).toContain('only say neutrally and briefly what it is');
    expect(prompt).toContain('Never judge its condition');
  });

  it('lets the AI tell an item for sale, a service and a wanted ad apart, with how its price reads', async () => {
    draft.mockResolvedValue({ texts: TEXTS, type: 'WANTED', price: 90, priceMode: 'UP_TO' });

    const listing = await writeListing(Buffer.from(''), 'busco bici, hasta 90€', ['es', 'en']);

    expect(listing).toMatchObject({ type: 'WANTED', price: 90, priceMode: 'UP_TO' });
    const { prompt, schema } = draft.mock.calls[0][3];
    expect(schema.properties.type.enum).toEqual(['PRODUCT', 'SERVICE', 'WANTED']);
    expect(schema.properties.priceMode.enum).toEqual(['NONE', 'FIXED', 'FROM', 'UP_TO']);
    expect(schema.required).toEqual(expect.arrayContaining(['type', 'price', 'priceMode']));
    expect(schema.properties).not.toHaveProperty('condition');
    expect(prompt).toContain('WANTED if the person is LOOKING FOR a thing or someone');

    draft.mockResolvedValue({ texts: TEXTS, type: 'SERVICE', price: 20, priceMode: 'FROM' });
    expect(await writeListing(Buffer.from(''), 'Ana, clases de guitarra desde 20€', ['es', 'en'])).toMatchObject({ type: 'SERVICE', priceMode: 'FROM' });
  });

  it('keeps a type the admin chose, whatever the AI answers', async () => {
    draft.mockResolvedValue({ texts: TEXTS, type: 'PRODUCT', condition: 'good', price: 50 });
    expect((await writeListing(Buffer.from(''), 'tabla', ['es', 'en'], 'WANTED')).type).toBe('WANTED');
    expect(draft.mock.calls[0][3].prompt).toContain('this IS a wanted ad');

    draft.mockResolvedValue({ texts: TEXTS, type: 'PRODUCT', price: null, priceMode: 'NONE' });
    expect((await writeListing(Buffer.from(''), 'taller de bicis', ['es', 'en'], 'SERVICE')).type).toBe('SERVICE');
  });

  it('is an item for sale when the AI says nothing about the type', async () => {
    draft.mockResolvedValue({ texts: TEXTS, condition: 'good', price: 80 });
    expect((await writeListing(Buffer.from(''), 'bici', ['es', 'en'])).type).toBe('PRODUCT');
  });

  it('asks a service only for its price and how it reads, never guessed', async () => {
    draft.mockResolvedValue({ texts: TEXTS, price: 20, priceMode: 'FROM' });

    const listing = await writeListing(Buffer.from(''), 'Ana, clases de guitarra desde 20€', ['es', 'en'], 'SERVICE');

    expect(listing).toMatchObject({ price: 20, priceMode: 'FROM', type: 'SERVICE' });
    const { prompt, schema } = draft.mock.calls[0][3];
    expect(schema.required).toEqual(['texts', 'price', 'priceMode']);
    expect(prompt).toContain('never guessed');
  });

  it('reads an event\'s entry price, start and address', async () => {
    draft.mockResolvedValue({ texts: TEXTS, price: 0, startsAt: '2026-11-26T19:00', address: 'Plaza de Lajares' });

    const listing = await writeListing(Buffer.from(''), 'Bachata gratis el jueves a las 19h en la plaza de Lajares', ['es', 'en'], 'EVENT');

    expect(listing).toMatchObject({ price: 0, startsAt: '2026-11-26T19:00', address: 'Plaza de Lajares', type: 'EVENT' });
    const { prompt, schema } = draft.mock.calls[0][3];
    expect(schema.required).toEqual(['texts', 'price', 'startsAt', 'address']);
    expect(prompt).toContain('Today is');
  });

});

describe('writeListing with the admin\'s own text', () => {
  beforeEach(() => draft.mockReset());

  it('keeps title and description word for word in the shop language and only translates them', async () => {
    // The AI tidied the words anyway; the admin's own text must win.
    draft.mockResolvedValue({ texts: { es: { title: 'Bici', description: 'Bici muy cómoda.' }, en: TEXTS.en }, condition: 'good', price: 80 });

    const listing = await writeListing(Buffer.from(''), 'bici comoda 80€', ['es', 'en'], 'PRODUCT', { title: 'Mi bici', description: 'bici comoda 80€' });

    expect(listing.texts.es).toEqual({ title: 'Mi bici', description: 'bici comoda 80€' });
    expect(listing.texts.en).toEqual(TEXTS.en);
    expect(listing).toMatchObject({ price: 80 });
    expect(draft.mock.calls[0][3].prompt).toContain('title is exactly "Mi bici"');
  });

  it('lets the AI name the title when the admin gave none', async () => {
    draft.mockResolvedValue({ texts: TEXTS, condition: 'good', price: null });

    const listing = await writeListing(Buffer.from(''), 'bici comoda', ['es', 'en'], 'PRODUCT', { description: 'bici comoda' });

    expect(listing.texts.es).toEqual({ title: 'Bici de paseo', description: 'bici comoda' });
  });
});

describe('writeListing with the admin\'s own text, only corrected', () => {
  beforeEach(() => draft.mockReset());

  it('keeps the AI\'s corrected words and asks it only to fix mistakes', async () => {
    const corrected = { title: 'Mi bici', description: 'Bici cómoda, 80 €.' };
    draft.mockResolvedValue({ texts: { es: corrected, en: TEXTS.en }, condition: 'good', price: 80 });

    const listing = await writeListing(Buffer.from(''), 'bici comoda 80€', ['es', 'en'], 'PRODUCT', {
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
