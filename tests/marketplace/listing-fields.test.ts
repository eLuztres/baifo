import { readListingFields } from '@/lib/marketplace/ai';
import { fieldState } from '@/lib/marketplace/listing-fields';
import { draftText } from '@/lib/studio/openai.mjs';

jest.mock('@/db/prisma', () => ({ prisma: {} }));
jest.mock('@/lib/studio/openai.mjs', () => ({ draftText: jest.fn(), editImage: jest.fn(), onUsage: jest.fn() }));
jest.mock('@/lib/studio/prompts.mjs', () => ({ seedOf: () => 0 }));

const draft = draftText as jest.Mock;

const PLACES = [
  { slug: 'corralejo', name: 'Corralejo' },
  { slug: 'el-cotillo', name: 'El Cotillo' },
];


beforeEach(() => jest.clearAllMocks());

describe('readListingFields', () => {
  it("reads an event's date, town, address and entry from the description, and asks for nothing else", async () => {
    draft.mockResolvedValue({ price: 0, startsAt: '2026-11-29T19:00', address: 'Bar La Ola, Calle Mayor 3', place: 'el-cotillo' });

    const fields = await readListingFields('Concierto gratis el sábado 29 a las 19h en Bar La Ola, El Cotillo', 'EVENT', PLACES);

    expect(fields).toMatchObject({ price: 0, startsAt: '2026-11-29T19:00', address: 'Bar La Ola, Calle Mayor 3', place: 'el-cotillo' });
    const { prompt, schema } = draft.mock.calls[0][3];
    expect(Object.keys(schema.properties).sort()).toEqual(['address', 'place', 'price', 'startsAt']);
    // A town the text doesn't name is null, never the first one.
    expect(schema.properties.place.enum).toContain(null);
    expect(prompt).toMatch(/never guess or invent/);
    expect(prompt).toContain('Concierto gratis');
  });

  it('leaves what the text does not say empty', async () => {
    draft.mockResolvedValue({ price: null, priceMode: null });

    expect(await readListingFields('Una mesa de madera', 'PRODUCT')).toMatchObject({ price: null, priceMode: null, place: null });
    const { schema, prompt } = draft.mock.calls[0][3];
    expect(schema.properties.priceMode.enum).toContain(null);
    // One live place: nothing to choose, so the AI isn't asked.
    expect(schema.properties.place).toBeUndefined();
    expect(prompt).toContain('NONE and null when no price is named');
  });

  it('asks every listing but an event for its price and how it reads', async () => {
    draft.mockResolvedValue({ price: 20, priceMode: 'FROM' });
    expect(await readListingFields('Clases de guitarra desde 20€', 'SERVICE')).toMatchObject({ price: 20, priceMode: 'FROM' });

    draft.mockResolvedValue({ price: 150, priceMode: 'UP_TO' });
    await readListingFields('Busco tabla, hasta 150€', 'WANTED');
    expect(Object.keys(draft.mock.calls[1][3].schema.properties).sort()).toEqual(['price', 'priceMode']);
  });
});

describe('fieldState', () => {
  it('tells set from missing, and marks what publishing needs', () => {
    expect(fieldState('address', 'Bar La Ola', 'EVENT')).toBe('set');
    expect(fieldState('address', '', 'EVENT')).toBe('missing');
    expect(fieldState('startsAt', '', 'EVENT')).toBe('needed');
    // The amount only shows while a price is chosen.
    expect(fieldState('price', '', 'PRODUCT')).toBe('needed');
    expect(fieldState('price', '', 'SERVICE')).toBe('needed');
  });
});
