import { findCategory, toProductTranslations } from '@/lib/marketplace/catalog';
import { writeListing } from '@/lib/marketplace/ai';
import { draftText } from '@/lib/studio/openai.mjs';

jest.mock('@/db/prisma', () => ({ prisma: {} }));
jest.mock('@/lib/studio/openai.mjs', () => ({ draftText: jest.fn(), editImage: jest.fn() }));

const draft = draftText as jest.Mock;

const CATEGORIES = [
  { id: 'c1', slug: 'motor', name: { es: 'Bicis y motor', en: 'Bikes and vehicles' }, keywords: ['bicicleta', 'patinete'] },
  { id: 'c2', slug: 'otros', name: { es: 'Otros', en: 'Other' }, keywords: [] },
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
    expect(schema.properties.category.enum).toEqual(['motor', 'otros']);
    expect(schema.properties.texts.required).toEqual(['es', 'en']);
    expect(prompt).toContain('motor: Bicis y motor / Bikes and vehicles (e.g. bicicleta, patinete)');
  });

  it('puts a listing in "otros" when the category no longer exists', async () => {
    draft.mockResolvedValue({ texts: TEXTS, category: 'muebles', condition: 'good', price: null });

    expect((await writeListing(Buffer.from(''), '', CATEGORIES, ['es', 'en'])).category).toBe('otros');
  });
});
