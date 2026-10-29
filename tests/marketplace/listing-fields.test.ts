import { readListingFields } from '@/lib/marketplace/ai';
import { fieldState, fillEmptyFields, type FieldValues } from '@/lib/marketplace/listing-fields';
import { draftText } from '@/lib/studio/openai.mjs';

jest.mock('@/db/prisma', () => ({ prisma: {} }));
jest.mock('@/lib/studio/openai.mjs', () => ({ draftText: jest.fn(), editImage: jest.fn(), onUsage: jest.fn() }));
jest.mock('@/lib/studio/prompts.mjs', () => ({ seedOf: () => 0 }));

const draft = draftText as jest.Mock;

const CATEGORIES = [
  { id: 'c1', slug: 'musica', name: { es: 'Música', en: 'Music' }, keywords: [], parentId: null, parent: null },
  { id: 'c2', slug: 'otros', name: { es: 'Otros', en: 'Other' }, keywords: [], parentId: null, parent: null },
];
const PLACES = [
  { slug: 'corralejo', name: 'Corralejo' },
  { slug: 'el-cotillo', name: 'El Cotillo' },
];

const EMPTY: FieldValues = { category: '', price: '', priceMax: '', condition: '', serviceType: '', startsAt: '', address: '', placeId: '' };

beforeEach(() => jest.clearAllMocks());

describe('readListingFields', () => {
  it("reads an event's date, town, address, entry and category from the description, and asks for nothing else", async () => {
    draft.mockResolvedValue({ category: 'musica', price: 0, startsAt: '2026-11-29T19:00', address: 'Bar La Ola, Calle Mayor 3', place: 'el-cotillo' });

    const fields = await readListingFields('Concierto gratis el sábado 29 a las 19h en Bar La Ola, El Cotillo', 'EVENT', CATEGORIES, PLACES);

    expect(fields).toMatchObject({ category: 'musica', price: 0, startsAt: '2026-11-29T19:00', address: 'Bar La Ola, Calle Mayor 3', place: 'el-cotillo' });
    const { prompt, schema } = draft.mock.calls[0][3];
    expect(Object.keys(schema.properties).sort()).toEqual(['address', 'category', 'place', 'price', 'startsAt']);
    // A town the text doesn't name is null, never the first one.
    expect(schema.properties.place.enum).toContain(null);
    expect(prompt).toMatch(/never guess or invent/);
    expect(prompt).toContain('Concierto gratis');
  });

  it('leaves what the text does not say empty', async () => {
    draft.mockResolvedValue({ category: 'otros', price: null, condition: null, priceMax: null });

    expect(await readListingFields('Una mesa de madera', 'PRODUCT', CATEGORIES)).toMatchObject({ price: null, condition: null, priceMax: null, place: null });
    const { schema, prompt } = draft.mock.calls[0][3];
    expect(schema.properties.condition.enum).toContain(null);
    // One live place: nothing to choose, so the AI isn't asked.
    expect(schema.properties.place).toBeUndefined();
    expect(prompt).toMatch(/price: .*null if they named none\. Never guess one/);
  });

  it("asks a service for its kind of offer and a wanted ad for its budget", async () => {
    draft.mockResolvedValue({ category: 'otros', price: 20, serviceType: 'class' });
    expect(await readListingFields('Clases de guitarra desde 20€', 'SERVICE', CATEGORIES)).toMatchObject({ price: 20, serviceType: 'class' });

    draft.mockResolvedValue({ category: 'otros', price: null, priceMax: 150, condition: 'any' });
    await readListingFields('Busco tabla, hasta 150€', 'WANTED', CATEGORIES);
    expect(Object.keys(draft.mock.calls[1][3].schema.properties).sort()).toEqual(['category', 'condition', 'price', 'priceMax']);
  });

  it('gives no category when the AI answers with one that is gone', async () => {
    draft.mockResolvedValue({ category: 'deleted', price: null, condition: null, priceMax: null });
    expect((await readListingFields('Algo', 'PRODUCT', CATEGORIES)).category).toBeNull();
  });
});

describe('fillEmptyFields', () => {
  it('fills only the empty fields and keeps what the admin set by hand', () => {
    const current = { ...EMPTY, category: 'otros', address: 'Mi dirección', title: 'Concierto' };
    const { fields, filled } = fillEmptyFields(current, { category: 'musica', startsAt: '2026-11-29T19:00', address: 'Bar La Ola', placeId: 'p2', price: '' }, 'EVENT');

    expect(fields).toMatchObject({ category: 'otros', address: 'Mi dirección', startsAt: '2026-11-29T19:00', placeId: 'p2', title: 'Concierto' });
    expect(filled).toEqual(['startsAt', 'placeId']);
  });

  it("treats an event's starting 0 as not set, but keeps any other price", () => {
    expect(fillEmptyFields({ ...EMPTY, price: '0' }, { price: '12.00' }, 'EVENT').filled).toEqual(['price']);
    expect(fillEmptyFields({ ...EMPTY, price: '0' }, { price: '12.00' }, 'PRODUCT').filled).toEqual([]);
    expect(fillEmptyFields({ ...EMPTY, price: '8' }, { price: '12.00' }, 'EVENT').filled).toEqual([]);
  });

  it('does not report a free event as filled when the description says it is free', () => {
    expect(fillEmptyFields({ ...EMPTY, price: '0' }, { price: '0.00' }, 'EVENT').filled).toEqual([]);
  });
});

describe('fieldState', () => {
  it('tells set from missing, and marks what publishing needs', () => {
    expect(fieldState('address', 'Bar La Ola', 'EVENT')).toBe('set');
    expect(fieldState('address', '', 'EVENT')).toBe('missing');
    expect(fieldState('startsAt', '', 'EVENT')).toBe('needed');
    expect(fieldState('price', '', 'PRODUCT')).toBe('needed');
    // A service may go without a "from" price.
    expect(fieldState('price', '', 'SERVICE')).toBe('missing');
    expect(fieldState('category', ' ', 'SERVICE')).toBe('needed');
  });
});
