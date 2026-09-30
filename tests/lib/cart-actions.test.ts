import { Prisma } from '@prisma/client';
import { cookies } from 'next/headers';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { addItemToCart } from '@/lib/actions/cart.actions';

jest.mock('@/auth', () => ({ auth: jest.fn() }));
jest.mock('@/db/prisma', () => ({
  prisma: {
    product: { findFirst: jest.fn() },
    cart: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
  },
}));
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));
jest.mock('next/headers', () => ({ cookies: jest.fn() }));

const db = prisma as unknown as Record<'product' | 'cart', Record<string, jest.Mock>>;

const PRODUCT = {
  id: 'p1',
  name: 'Volcanic Lamp',
  slug: 'volcanic-lamp',
  stock: 5,
  price: new Prisma.Decimal('120.5'),
};

// What a tampered browser request could send
const FORGED_ITEM = {
  productId: 'p1',
  name: 'Volcanic Lamp',
  slug: 'volcanic-lamp',
  qty: 1,
  image: '/lamp.jpg',
  price: '0.01',
};

beforeEach(() => {
  (cookies as jest.Mock).mockResolvedValue({ get: () => ({ value: 'session-1' }) });
  (auth as jest.Mock).mockResolvedValue(null);
  db.product.findFirst.mockResolvedValue(PRODUCT);
});

describe('addItemToCart pricing', () => {
  it('uses the database price for a new cart, ignoring the client price', async () => {
    db.cart.findFirst.mockResolvedValue(null);

    await expect(addItemToCart(FORGED_ITEM)).resolves.toMatchObject({ success: true });

    const { data } = db.cart.create.mock.calls[0][0];
    expect(data.items[0].price).toBe('120.50');
    expect(data.itemsPrice).toBe('120.50');
    expect(data.totalPrice).not.toBe('0.01');
  });

  it('uses the database price when adding to an existing cart', async () => {
    db.cart.findFirst.mockResolvedValue({
      id: 'cart-1',
      items: [],
      itemsPrice: '0',
      totalPrice: '0',
      shippingPrice: '0',
      taxPrice: '0',
    });

    await addItemToCart(FORGED_ITEM);

    const { data } = db.cart.update.mock.calls[0][0];
    expect(data.items[0].price).toBe('120.50');
    expect(data.itemsPrice).toBe('120.50');
  });

  it('corrects a forged price already stored in the cart', async () => {
    db.cart.findFirst.mockResolvedValue({
      id: 'cart-1',
      items: [{ ...FORGED_ITEM }],
      itemsPrice: '0.01',
      totalPrice: '10.01',
      shippingPrice: '10.00',
      taxPrice: '0.00',
    });

    await addItemToCart(FORGED_ITEM);

    const { data } = db.cart.update.mock.calls[0][0];
    expect(data.items[0]).toMatchObject({ qty: 2, price: '120.50' });
    expect(data.itemsPrice).toBe('241.00');
  });
});
