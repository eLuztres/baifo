import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { reorderRings } from '@/lib/actions/category.actions';

jest.mock('@/auth', () => ({ auth: jest.fn(), signIn: jest.fn(), signOut: jest.fn() }));
jest.mock('@/db/prisma', () => ({
  prisma: {
    product: { findMany: jest.fn(), update: jest.fn((args) => args) },
    $transaction: jest.fn(),
  },
}));
jest.mock('@/lib/marketplace/ai', () => ({ translateText: jest.fn() }));
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));
jest.mock('next/headers', () => ({ cookies: jest.fn(), headers: jest.fn() }));

const mockAuth = auth as unknown as jest.Mock;
const db = prisma as unknown as { product: Record<string, jest.Mock>; $transaction: jest.Mock };

const ADMIN = { user: { id: 'admin-1', role: 'admin' } };
const CUSTOMER = { user: { id: 'u1', role: 'user' } };
const id = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;

/** The shop's rings in their current order: 1, 2, 3, 4, 5. Rings 2, 4 and 5 are in the category being sorted. */
const RINGS = [1, 2, 3, 4, 5].map((n) => ({ id: id(n), sortOrder: n }));

/** The order the transaction leaves the shop in, as ring numbers. */
const savedOrder = () => {
  const updates = db.$transaction.mock.calls[0][0] as { where: { id: string }; data: { sortOrder: number } }[];
  const order = new Map(RINGS.map((ring) => [ring.id, ring.sortOrder]));
  updates.forEach(({ where, data }) => order.set(where.id, data.sortOrder));
  return [...order].sort((a, b) => a[1] - b[1]).map(([ringId]) => Number(ringId.slice(-1)));
};

beforeEach(() => {
  jest.clearAllMocks();
  db.product.findMany.mockResolvedValue(RINGS);
});

describe('reorderRings', () => {
  it('refuses non-admins', async () => {
    mockAuth.mockResolvedValue(CUSTOMER);
    await expect(reorderRings([id(4), id(2)])).resolves.toEqual({ success: false, message: 'ERROR_ADMIN_ONLY' });
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("swaps the category's rings among their own places and leaves the others where they are", async () => {
    mockAuth.mockResolvedValue(ADMIN);
    await expect(reorderRings([id(5), id(2), id(4)])).resolves.toMatchObject({ success: true });
    expect(savedOrder()).toEqual([1, 5, 3, 2, 4]);
  });

  it('only writes the rings whose place changed', async () => {
    mockAuth.mockResolvedValue(ADMIN);
    await reorderRings([id(2), id(5), id(4)]);
    expect(db.$transaction.mock.calls[0][0]).toHaveLength(2);
  });

  it('ignores rings that no longer exist', async () => {
    mockAuth.mockResolvedValue(ADMIN);
    await reorderRings([id(4), id(9), id(2)]);
    expect(savedOrder()).toEqual([1, 4, 3, 2, 5]);
  });
});
