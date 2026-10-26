import { categoryRefs, findCategory, toProductTranslations } from '@/lib/marketplace/catalog';
import { translateText, writeListing } from '@/lib/marketplace/ai';
import { draftText } from '@/lib/studio/openai.mjs';

jest.mock('@/db/prisma', () => ({ prisma: {} }));
jest.mock('@/lib/studio/openai.mjs', () => ({ draftText: jest.fn(), editImage: jest.fn(), onUsage: jest.fn() }));

const draft = draftText as jest.Mock;

const CATEGORIES = [
  { id: 'c1', slug: 'motor', name: { es: 'Bicis y motor', en: 'Bikes and vehicles' }, keywords: ['bicicleta', 'patinete'], parentId: null, parent: null },
  { id: 'c2', slug: 'otros', name: { es: 'Otros', en: 'Other' }, keywords: [], parentId: null, parent: null },
];

const SERVICE_CATEGORIES = [
  { id: 's1', slug: 'ninos-y-mayores', name: { es: 'Niños y mayores', en: 'Children and elderly care' }, keywords: [], parentId: 'servicios', parent: { name: { es: 'Servicios' } } },
  { id: 's2', slug: 'clases', name: { es: 'Clases', en: 'Lessons' }, keywords: [], parentId: 'servicios', parent: { name: { es: 'Servicios' } } },
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

  it('offers the wanted categories only for a wanted ad, and only when the shop has them', async () => {
    const wanted = { id: 'w1', slug: 'busco-motor', name: { es: 'Bicis, motos y coches', en: 'Bikes' }, keywords: [], parentId: 'busco', parent: { name: { es: 'Busco' } } };
    draft.mockResolvedValue({ texts: TEXTS, category: 'busco-motor', condition: 'good', price: 50 });

    expect((await writeListing(Buffer.from(''), 'busco bici', [...CATEGORIES, wanted], ['es', 'en'])).category).toBe('busco-motor');
    expect(draft.mock.calls[0][3].prompt).toMatch(/WANTED AD[\s\S]*busco-motor/);
    expect(draft.mock.calls[0][3].schema.properties.category.enum).toContain('busco-motor');

    await writeListing(Buffer.from(''), 'bici', CATEGORIES, ['es', 'en']);
    expect(draft.mock.calls[1][3].prompt).not.toContain('WANTED AD');
  });

  it('puts a listing in "otros" when the category no longer exists', async () => {
    draft.mockResolvedValue({ texts: TEXTS, category: 'muebles', condition: 'good', price: null });

    expect((await writeListing(Buffer.from(''), '', CATEGORIES, ['es', 'en'])).category).toBe('otros');
  });

  it('asks for a service without condition or price, in a kind of service', async () => {
    draft.mockResolvedValue({ texts: TEXTS, category: 'clases' });

    const listing = await writeListing(Buffer.from(''), 'Ana, clases de guitarra', SERVICE_CATEGORIES, ['es', 'en'], 'service');

    expect(listing).toMatchObject({ category: 'clases', condition: null, price: null });
    const { prompt, schema } = draft.mock.calls[0][3];
    expect(schema.required).toEqual(['texts', 'category']);
    expect(prompt).toContain('Never mention a price');
  });

  it('puts a service in the first kind of service when its kind no longer exists', async () => {
    draft.mockResolvedValue({ texts: TEXTS, category: 'jardineria' });

    expect((await writeListing(Buffer.from(''), '', SERVICE_CATEGORIES, ['es', 'en'], 'service')).category).toBe('ninos-y-mayores');
  });
});

describe('writeListing with the admin\'s own text', () => {
  beforeEach(() => draft.mockReset());

  it('keeps title and description word for word in the shop language and only translates them', async () => {
    // The AI tidied the words anyway; the admin's own text must win.
    draft.mockResolvedValue({ texts: { es: { title: 'Bici', description: 'Bici muy cómoda.' }, en: TEXTS.en }, category: 'motor', condition: 'good', price: 80 });

    const listing = await writeListing(Buffer.from(''), 'bici comoda 80€', CATEGORIES, ['es', 'en'], 'product', { title: 'Mi bici', description: 'bici comoda 80€' });

    expect(listing.texts.es).toEqual({ title: 'Mi bici', description: 'bici comoda 80€' });
    expect(listing.texts.en).toEqual(TEXTS.en);
    expect(listing).toMatchObject({ category: 'motor', condition: 'good', price: 80 });
    expect(draft.mock.calls[0][3].prompt).toContain('title is exactly "Mi bici"');
  });

  it('lets the AI name the title when the admin gave none', async () => {
    draft.mockResolvedValue({ texts: TEXTS, category: 'motor', condition: 'good', price: null });

    const listing = await writeListing(Buffer.from(''), 'bici comoda', CATEGORIES, ['es', 'en'], 'product', { description: 'bici comoda' });

    expect(listing.texts.es).toEqual({ title: 'Bici de paseo', description: 'bici comoda' });
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

describe('categoryRefs', () => {
  it('links a kind of service to Servicios too, a store category only to itself', () => {
    expect(categoryRefs({ id: 's1', parentId: 'servicios' })).toEqual([{ id: 's1' }, { id: 'servicios' }]);
    expect(categoryRefs({ id: 'c1', parentId: null })).toEqual([{ id: 'c1' }]);
  });
});
