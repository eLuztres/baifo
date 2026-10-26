import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { updateUser, getAllUsers } from '@/lib/actions/user.actions';
import {
  deleteOrder,
  deliverOrder,
  getAllOrders,
  getOrderSummary,
  updateOrderToPaidCOD,
} from '@/lib/actions/order.actions';
import { createProduct, deleteProduct, updateProduct } from '@/lib/actions/product.actions';
import * as orderActions from '@/lib/actions/order.actions';

jest.mock('@/auth', () => ({ auth: jest.fn(), signIn: jest.fn(), signOut: jest.fn() }));
jest.mock('@/db/prisma', () => {
  const model = () => ({
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn().mockResolvedValue([]),
    count: jest.fn().mockResolvedValue(0),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    aggregate: jest.fn(),
  });
  return {
    prisma: {
      user: model(),
      order: model(),
      product: model(),
      orderItem: model(),
      $queryRaw: jest.fn().mockResolvedValue([]),
      $transaction: jest.fn(),
    },
  };
});
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));
jest.mock('next/headers', () => ({ cookies: jest.fn(), headers: jest.fn() }));
jest.mock('@/email', () => ({ sendWelcomeEmail: jest.fn(), sendPurchaseReceipt: jest.fn() }));
// A shop without an owner, whatever .env says; the owner rules are tested in owner.test.ts.
jest.mock('@/lib/constants', () => ({ ...jest.requireActual('@/lib/constants'), OWNER_EMAIL: '' }));

const mockAuth = auth as unknown as jest.Mock;
const db = prisma as unknown as Record<'user' | 'order' | 'product', Record<string, jest.Mock>>;

const GUEST = null;
const CUSTOMER = { user: { id: 'u1', role: 'user' } };
const ADMIN = { user: { id: 'admin-1', role: 'admin' } };

const PRODUCT_INPUT = {
  name: 'Volcanic Lamp',
  slug: 'volcanic-lamp',
  category: 'Lamps',
  brand: 'Eluztres',
  description: 'Resin and stone',
  stock: 3,
  images: ['/lamp.jpg'],
  isFeatured: false,
  banner: null,
  price: '120.50',
};

// Each case calls the action and names the DB write it must not reach
const MUTATIONS: [string, () => Promise<{ success: boolean; message: string }>, () => jest.Mock][] = [
  ['updateUser', () => updateUser({ id: 'u1', name: 'Me', email: 'me@x.com', role: 'admin' }), () => db.user.update],
  ['deleteOrder', () => deleteOrder('o1'), () => db.order.delete],
  ['updateOrderToPaidCOD', () => updateOrderToPaidCOD('o1'), () => db.order.findFirst],
  ['deliverOrder', () => deliverOrder('o1'), () => db.order.update],
  ['createProduct', () => createProduct(PRODUCT_INPUT), () => db.product.create],
  ['updateProduct', () => updateProduct({ ...PRODUCT_INPUT, id: 'p1' }), () => db.product.update],
  ['deleteProduct', () => deleteProduct('p1'), () => db.product.delete],
];

const READS: [string, () => Promise<unknown>][] = [
  ['getAllUsers', () => getAllUsers({ page: 1, query: '' })],
  ['getAllOrders', () => getAllOrders({ page: 1, query: '' })],
  ['getOrderSummary', () => getOrderSummary()],
];

describe.each([
  ['a guest', GUEST],
  ['a regular user', CUSTOMER],
])('admin actions called by %s', (_, session) => {
  beforeEach(() => mockAuth.mockResolvedValue(session));

  it.each(MUTATIONS)('%s is refused without touching the database', async (_, call, write) => {
    await expect(call()).resolves.toEqual({ success: false, message: 'ERROR_ADMIN_ONLY' });
    expect(write()).not.toHaveBeenCalled();
  });

  it.each(READS)('%s refuses to return data', async (_, call) => {
    await expect(call()).rejects.toThrow('ERROR_ADMIN_ONLY');
    expect(db.user.findMany).not.toHaveBeenCalled();
    expect(db.order.findMany).not.toHaveBeenCalled();
  });
});

describe('admin actions called by an admin', () => {
  beforeEach(() => mockAuth.mockResolvedValue(ADMIN));

  it('updateUser changes the role', async () => {
    db.user.findUnique.mockResolvedValue({ email: 'ana@x.com', role: 'user' });
    await expect(
      updateUser({ id: 'u1', name: 'Ana', email: 'ana@x.com', role: 'admin' })
    ).resolves.toMatchObject({ success: true });
    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { name: 'Ana', role: 'admin' },
    });
  });

  it('deleteProduct deletes an existing product', async () => {
    db.product.findFirst.mockResolvedValue({ id: 'p1' });
    await expect(deleteProduct('p1')).resolves.toMatchObject({ success: true });
    expect(db.product.delete).toHaveBeenCalledWith({ where: { id: 'p1' } });
  });

  it('getAllUsers returns data', async () => {
    await expect(getAllUsers({ page: 1, query: '' })).resolves.toEqual({ data: [], totalPages: 0 });
  });
});

describe('marking orders as paid', () => {
  // Every export of a 'use server' file can be called from the browser
  it('is not exposed as a server action', () => {
    expect(orderActions).not.toHaveProperty('updateOrderToPaid');
  });
});
