import { groupByCategory } from '@/components/shared/home/materials';
import type { StoreCategory } from '@/lib/actions/category.actions';
import { localize, localizeProduct } from '@/lib/category';

describe('localize', () => {
  it('falls back to another language when the visitor\'s is missing', () => {
    expect(localize({ es: 'Lava y arena', en: 'Lava and sand' }, 'en')).toBe('Lava and sand');
    expect(localize({ es: 'Lava y arena' }, 'fr')).toBe('Lava y arena');
    expect(localize(null, 'es')).toBe('');
  });
});

describe('localizeProduct', () => {
  const product = { name: 'Bici de paseo', description: 'Bici cómoda.', translations: { en: { name: 'City bike', description: 'Comfy bike.' } } };

  it("shows a product's name and description in the visitor's language, else its own", () => {
    expect(localizeProduct(product, 'en')).toEqual({ name: 'City bike', description: 'Comfy bike.', shortName: 'City bike' });
    expect(localizeProduct(product, 'it')).toEqual({ name: 'Bici de paseo', description: 'Bici cómoda.', shortName: 'Bici de paseo' });
    expect(localizeProduct({ name: 'Anillo', translations: {} }, 'en')).toEqual({ name: 'Anillo', description: '', shortName: 'Anillo' });
  });

  it('shows the short name in the visitor\'s language, never the shop language\'s next to a translated name', () => {
    const withShort = { ...product, shortName: 'Bici', translations: { en: { name: 'City bike', shortName: 'Bike' }, de: { name: 'Stadtrad' } } };
    expect(localizeProduct(withShort, 'en').shortName).toBe('Bike');
    expect(localizeProduct(withShort, 'de').shortName).toBe('Stadtrad');
    expect(localizeProduct(withShort, 'it').shortName).toBe('Bici');
  });
});

describe('groupByCategory', () => {
  const category = (id: string, slug: string): StoreCategory => ({
    id,
    slug,
    name: { es: slug },
    text: { es: '' },
    image: null,
    keywords: [],
    scene: '',
    sceneVariants: [],
  });
  const ring = (slug: string, categoryIds: string[]) => ({
    id: slug,
    slug,
    name: slug,
    image: `/${slug}.jpg`,
    images: [`/${slug}.jpg`],
    price: '70.00',
    isReserved: false,
    type: 'PRODUCT' as const,
    placeId: null,
    categoryIds,
    createdAt: new Date(0),
    condition: null,
    translations: {},
    endsAt: null,
  });
  const categories = [category('c1', 'lava'), category('c2', 'wood'), category('c3', 'carbon')];
  const rings = [ring('a', ['c1', 'c2']), ring('b', ['c2'])];

  it('puts a ring in each of its categories and hides empty ones from visitors', () => {
    const groups = groupByCategory(categories, rings, 'es');
    expect(groups.map((group) => [group.id, group.rings.map((r) => r.slug)])).toEqual([
      ['lava', ['a']],
      ['wood', ['a', 'b']],
    ]);
    expect(groups[0].rings[0]).not.toHaveProperty('categoryIds');
  });

  it('keeps empty categories for admins', () => {
    expect(groupByCategory(categories, rings, 'es', true).map((group) => group.id)).toEqual(['lava', 'wood', 'carbon']);
  });

  it('counts the rings that went into the shop lately, for "New: 1" on the ring card', () => {
    const fresh = { ...ring('c', ['c2']), createdAt: new Date() };
    const groups = groupByCategory(categories, [...rings, fresh], 'es');
    expect(groups.map((group) => [group.id, group.newCount])).toEqual([
      ['lava', 0],
      ['wood', 1],
    ]);
  });
});
