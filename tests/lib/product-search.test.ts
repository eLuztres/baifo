import { prisma } from '@/db/prisma';
import { getAllProducts } from '@/lib/actions/product.actions';

jest.mock('@/auth', () => ({ auth: jest.fn(), signIn: jest.fn(), signOut: jest.fn() }));
jest.mock('@/db/prisma', () => ({
  prisma: {
    product: {
      findMany: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
    },
  },
}));
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));

const findMany = prisma.product.findMany as jest.Mock;

const NAMES = [
  { id: 'p1', name: 'Anillo de ópalo y macramé' },
  { id: 'p2', name: 'Anillo Ojo de Santa Lucía' },
  { id: 'p3', name: 'Anillo de latón y palisandro' },
];

/** The ids the page query was limited to. */
async function searchIds(query: string) {
  findMany.mockReset();
  findMany.mockResolvedValueOnce(NAMES).mockResolvedValueOnce([]);
  await getAllProducts({ query, page: 1 });
  return findMany.mock.calls[1][0].where.id?.in;
}

describe('getAllProducts search', () => {
  it.each([
    ['opalo', ['p1']],
    ['ÓPALO', ['p1']],
    ['lucia', ['p2']],
    ['Latón', ['p3']],
    ['anillo', ['p1', 'p2', 'p3']],
    ['zafiro', []],
  ])('"%s" finds %p, with or without accents', async (query, ids) => {
    expect(await searchIds(query)).toEqual(ids);
  });

  it('does not filter by name without a query', async () => {
    findMany.mockReset();
    findMany.mockResolvedValue([]);
    await getAllProducts({ query: 'all', page: 1 });

    expect(findMany).toHaveBeenCalledTimes(1);
    expect(findMany.mock.calls[0][0].where).not.toHaveProperty('id');
  });
});
