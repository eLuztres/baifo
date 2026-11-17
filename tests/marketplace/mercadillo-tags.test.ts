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
    expect(grid.findIndex((listing) => listing.id === 'l30')).toBe(12);
  });

  it('leaves a listing to its row when the list is too short to put it far away', () => {
    const grid = spreadRowListings(list(10, (index) => (index === 3 ? ['surf'] : [])), new Map([['surf', 5]]), 24);
    expect(grid.map((listing) => listing.id)).not.toContain('l3');
    expect(grid).toHaveLength(9);
  });
});

describe('spreadRowListings when some are left out', () => {
  // As the page draws it: a row before the card at its spot, or after the last card.
  const closest = (grid: { mercadilloIds: string[] }[], spots: Map<string, number>) =>
    Math.min(...grid.flatMap((listing, slot) => listing.mercadilloIds.map((id) => Math.abs(slot - Math.min(spots.get(id)!, grid.length)))));

  it('never leaves one close to its row after closing the gaps', () => {
    for (const [count, spot, inRow] of [[60, 24, (index: number) => index % 2 === 0], [40, 12, (index: number) => index < 30], [30, 24, () => true]] as const) {
      const listings = Array.from({ length: count }, (_, index) => ({ id: `l${index}`, mercadilloIds: inRow(index) ? ['a'] : [] }));
      const spots = new Map([['a', spot]]);
      const grid = spreadRowListings(listings, spots, 24);
      if (grid.some((listing) => listing.mercadilloIds.length > 0)) expect(closest(grid, spots)).toBeGreaterThanOrEqual(24);
    }
  });
});
