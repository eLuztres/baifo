import { matchesSearch, normalizeForSearch } from '@/lib/search';

jest.mock('@/db/prisma', () => ({ prisma: {} }));

describe('search', () => {
  it('ignores case and accents', () => {
    expect(normalizeForSearch('Sofá BEBÉ Fahrräder')).toBe('sofa bebe fahrrader');
    expect(matchesSearch('Sofá de tres plazas', 'SOFA')).toBe(true);
  });

  it('needs every word of the query, in any order', () => {
    expect(matchesSearch('Bicicleta de paseo turquesa', 'turquesa bici')).toBe(true);
    expect(matchesSearch('Bicicleta de paseo turquesa', 'bici roja')).toBe(false);
  });

  it('matches everything for an empty query', () => {
    expect(matchesSearch('anything', '   ')).toBe(true);
  });
});
