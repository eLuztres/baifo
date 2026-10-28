import { headers } from 'next/headers';
import { prisma } from '@/db/prisma';
import { getProductContact } from '@/lib/actions/product.actions';

interface Hit {
  action: string;
  ip: string;
  createdAt: Date;
}
interface HitWhere {
  action: string;
  ip?: string;
  createdAt: { gt?: Date; lte?: Date };
}

// A small in-memory stand-in for the RateLimitHit table, so the real counting logic runs.
let hits: Hit[] = [];
const matches = (hit: Hit, { action, ip, createdAt }: HitWhere) =>
  hit.action === action &&
  (ip === undefined || hit.ip === ip) &&
  (!createdAt.gt || hit.createdAt > createdAt.gt) &&
  (!createdAt.lte || hit.createdAt <= createdAt.lte);

jest.mock('@/auth', () => ({ auth: jest.fn(), signIn: jest.fn(), signOut: jest.fn() }));
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));
jest.mock('next/headers', () => ({ headers: jest.fn() }));
jest.mock('@/db/prisma', () => ({
  prisma: {
    product: { findFirst: jest.fn() },
    rateLimitHit: {
      count: jest.fn(async ({ where }: { where: HitWhere }) => hits.filter((hit) => matches(hit, where)).length),
      deleteMany: jest.fn(async ({ where }: { where: HitWhere }) => {
        hits = hits.filter((hit) => !matches(hit, where));
      }),
      create: jest.fn(async ({ data }: { data: Omit<Hit, 'createdAt'> }) => {
        hits.push({ ...data, createdAt: new Date() });
      }),
    },
    $transaction: jest.fn((operations: Promise<unknown>[]) => Promise.all(operations)),
  },
}));

const findFirst = prisma.product.findFirst as jest.Mock;
const PRODUCT_ID = '6f1c2a4e-8b3d-4c5e-9f7a-1b2c3d4e5f60';
const NUMBER = { phone: '+34600111222', whatsappUrl: 'https://wa.me/34600111222' };

const contactFrom = (ip: string) => {
  (headers as jest.Mock).mockResolvedValue(new Headers({ 'x-forwarded-for': ip }));
  return getProductContact(PRODUCT_ID);
};

async function useUpLimit(ip: string) {
  for (let i = 0; i < 30; i++) expect(await contactFrom(ip)).toEqual(NUMBER);
}

describe('getProductContact rate limit', () => {
  beforeEach(() => {
    hits = [];
    jest.useFakeTimers({ now: new Date('2026-10-28T12:00:00Z') });
    findFirst.mockReset().mockResolvedValue({ contactPhone: '+34 600 111 222' });
  });
  afterEach(() => jest.useRealTimers());

  it('gives the number while under the limit', async () => {
    await useUpLimit('1.1.1.1');
  });

  it('gives a friendly block and no number once over the limit', async () => {
    await useUpLimit('1.1.1.1');
    findFirst.mockClear();

    expect(await contactFrom('1.1.1.1')).toEqual({ isRateLimited: true });
    expect(findFirst).not.toHaveBeenCalled();
  });

  it('counts each IP on its own', async () => {
    await useUpLimit('1.1.1.1');

    expect(await contactFrom('2.2.2.2')).toEqual(NUMBER);
    expect(await contactFrom('1.1.1.1')).toEqual({ isRateLimited: true });
  });

  it('lets the IP in again once the 10-minute window has passed', async () => {
    await useUpLimit('1.1.1.1');
    expect(await contactFrom('1.1.1.1')).toEqual({ isRateLimited: true });

    jest.advanceTimersByTime(10 * 60 * 1000 + 1);

    expect(await contactFrom('1.1.1.1')).toEqual(NUMBER);
  });

  it('only gives the number of a listing that is still live', async () => {
    findFirst.mockResolvedValue(null);
    expect(await contactFrom('1.1.1.1')).toBeNull();

    const { where } = findFirst.mock.calls[0][0];
    expect(where.OR).toEqual([{ expiresAt: null }, { expiresAt: { gt: new Date() } }]);
  });
});
