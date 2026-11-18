import { mercadilloIdsOf, spreadRowListings } from '@/lib/mercadillos';

jest.mock('@/db/prisma', () => ({ prisma: {} }));

const SURF = { id: 'surf', tagIds: ['tablas', 'foil'] };
const MAGMA = { id: 'magma', tagIds: [] };

describe('mercadilloIdsOf', () => {
  it('puts a listing in every selección holding one of its etiquetas', () => {
    expect(mercadilloIdsOf([], ['foil'], [SURF, MAGMA])).toEqual(['surf']);
  });

  it('keeps the selecciones chosen by hand, once each', () => {
    expect(mercadilloIdsOf(['magma', 'surf'], ['tablas'], [SURF, MAGMA])).toEqual(['magma', 'surf']);
  });

  it('leaves a listing without those etiquetas out', () => {
    expect(mercadilloIdsOf([], ['musica'], [SURF, MAGMA])).toEqual([]);
  });
});

describe('spreadRowListings', () => {
  const list = (count: number, inRow: (index: number) => string[] = () => []) => Array.from({ length: count }, (_, index) => ({ id: `l${index}`, mercadilloIds: inRow(index) }));

  it('keeps every listing of a selección at least the gap away from its row', () => {
    const listings = list(100, (index) => (index % 5 === 0 ? ['surf'] : []));
    const grid = spreadRowListings(listings, new Map([['surf', 48]]), 24);
    grid.forEach((listing, slot) => {
      if (listing.mercadilloIds.includes('surf')) expect(Math.abs(slot - 48)).toBeGreaterThanOrEqual(24);
    });
    expect(new Set(grid.map((listing) => listing.id)).size).toBe(grid.length);
  });

  it('leaves the other listings in the mix order', () => {
    const listings = list(60, (index) => (index === 30 ? ['surf'] : []));
    const grid = spreadRowListings(listings, new Map([['surf', 36]]), 24);
    const others = grid.filter((listing) => listing.mercadilloIds.length === 0).map((listing) => listing.id);
    expect(others).toEqual(listings.filter((listing) => listing.mercadilloIds.length === 0).map((listing) => listing.id));
    expect(grid.findIndex((listing) => listing.id === 'l30')).toBe(11);
  });

  it('keeps a listing the list is too short to put far away, at the farthest place', () => {
    const grid = spreadRowListings(list(10, (index) => (index === 3 ? ['surf'] : [])), new Map([['surf', 5]]), 24);
    expect(grid).toHaveLength(10);
    expect(grid[0].id).toBe('l3');
  });

  it('keeps a listing in two selecciones away from both rows', () => {
    const grid = spreadRowListings(list(60, (index) => (index === 0 ? ['a', 'b'] : [])), new Map([['a', 12], ['b', 48]]), 12);
    expect(grid.findIndex((listing) => listing.id === 'l0')).toBe(24);
  });

  it('counts a row past the last card as at the end', () => {
    const grid = spreadRowListings(list(30, (index) => (index === 29 ? ['surf'] : [])), new Map([['surf', 48]]), 12);
    expect(grid.findIndex((listing) => listing.id === 'l29')).toBe(17);
  });
});

describe('spreadRowListings with more listings than far places', () => {
  it('shows every listing once, however short the list', () => {
    for (const [count, spot, inRow] of [[60, 24, (index: number) => index % 2 === 0], [40, 12, (index: number) => index < 30], [30, 24, () => true]] as const) {
      const listings = Array.from({ length: count }, (_, index) => ({ id: `l${index}`, mercadilloIds: inRow(index) ? ['a'] : [] }));
      const grid = spreadRowListings(listings, new Map([['a', spot]]), 24);
      expect(grid.map((listing) => listing.id).sort()).toEqual(listings.map((listing) => listing.id).sort());
    }
  });

  it('gives the far places to the ones that fit there first, the closer ones to the rest', () => {
    const listings = Array.from({ length: 40 }, (_, index) => ({ id: `l${index}`, mercadilloIds: index < 30 ? ['a'] : [] }));
    const grid = spreadRowListings(listings, new Map([['a', 12]]), 24);
    const distances = grid.flatMap((listing, slot) => (listing.mercadilloIds.length > 0 ? [Math.abs(slot - 12)] : []));
    // Only slots 36–39 are 24 away; the others in the selección go as far as they can, the rest of the list closest to the row.
    expect(distances.filter((distance) => distance >= 24)).toHaveLength(4);
    expect(Math.min(...distances)).toBeGreaterThanOrEqual(5);
    expect(grid.slice(10, 15).every((listing) => listing.mercadilloIds.length === 0)).toBe(true);
  });
});
