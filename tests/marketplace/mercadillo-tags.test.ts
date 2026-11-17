import { mercadilloIdsOf } from '@/lib/mercadillos';

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
