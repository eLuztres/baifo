import { headers } from 'next/headers';
import { authServer } from '@/auth';
import { prisma } from '@/db/prisma';
import { reserveProduct, sendInterest } from '@/lib/actions/reservation.actions';
import { getReviewByProductId, getReviews } from '@/lib/actions/review.actions';
import { signUpUser } from '@/lib/actions/user.actions';
import { getSessionUserId } from '@/lib/auth-guard';
import { alertOwnerOfRing } from '@/lib/owner-alerts';
import { isRateLimited } from '@/lib/rate-limit';
import { OWNER_MESSAGE_LIMIT, SIGN_UP_LIMIT } from '@/lib/constants';

jest.mock('@/auth', () => ({ authServer: { api: { signUpEmail: jest.fn() } } }));
jest.mock('@/db/prisma', () => ({
  prisma: {
    user: { findFirst: jest.fn() },
    product: { findUnique: jest.fn(), updateMany: jest.fn() },
    review: { findMany: jest.fn(), findFirst: jest.fn() },
  },
}));
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));
jest.mock('next/headers', () => ({ cookies: jest.fn(), headers: jest.fn() }));
jest.mock('@/lib/auth-guard', () => ({ getSession: jest.fn(async () => null), getSessionUserId: jest.fn(), isAdmin: jest.fn() }));
jest.mock('@/lib/i18n-server', () => ({ getT: async () => ({ t: (key: string) => key, locale: 'es' }) }));
jest.mock('@/lib/owner-alerts', () => ({ alertOwnerOfRing: jest.fn() }));
jest.mock('@/email', () => ({ formatReservationEnd: jest.fn(), sendUserNotification: jest.fn() }));
jest.mock('@/lib/rate-limit', () => ({ isRateLimited: jest.fn() }));

const mockLimited = isRateLimited as jest.Mock;
const db = prisma as unknown as Record<'user' | 'product' | 'review', Record<string, jest.Mock>>;
const PRODUCT_ID = '6f1c2a4e-8b3d-4c5e-9f7a-1b2c3d4e5f60';
const REQUEST = { productId: PRODUCT_ID, name: 'Ana', channel: 'whatsapp' as const, contact: '612345678' };

beforeEach(() => {
  mockLimited.mockResolvedValue(false);
  (headers as jest.Mock).mockResolvedValue(new Headers({ 'x-forwarded-for': '9.9.9.9' }));
  db.product.findUnique.mockResolvedValue({ name: 'Anillo', slug: 'anillo', images: [] });
  db.product.updateMany.mockResolvedValue({ count: 1 });
});

describe('messages to the owner ("I\'m interested", "Reserve")', () => {
  it('count per visitor IP', async () => {
    expect((await sendInterest(REQUEST)).success).toBe(true);
    expect(mockLimited).toHaveBeenCalledWith(OWNER_MESSAGE_LIMIT, '9.9.9.9');
  });

  it.each([
    ['sendInterest', sendInterest],
    ['reserveProduct', reserveProduct],
  ])('%s sends nothing and reserves nothing once the limit is reached', async (_name, action) => {
    mockLimited.mockResolvedValue(true);
    expect(await action(REQUEST)).toEqual({ success: false, message: 'TOO_MANY_REQUESTS' });
    expect(alertOwnerOfRing).not.toHaveBeenCalled();
    expect(db.product.updateMany).not.toHaveBeenCalled();
  });
});

describe('signUpUser', () => {
  const form = () => {
    const data = new FormData();
    data.set('name', 'Ana');
    data.set('email', 'ana@example.com');
    data.set('password', 'secret-password-1');
    data.set('confirmPassword', 'secret-password-1');
    return data;
  };

  it('stops before checking the email or creating the account once the IP used up its sign-ups', async () => {
    mockLimited.mockResolvedValue(true);
    expect(await signUpUser(null, form())).toEqual({ success: false, message: 'TOO_MANY_REQUESTS' });
    expect(mockLimited).toHaveBeenCalledWith(SIGN_UP_LIMIT, '9.9.9.9');
    expect(db.user.findFirst).not.toHaveBeenCalled();
    expect(authServer.api.signUpEmail).not.toHaveBeenCalled();
  });
});

describe('reviews', () => {
  it('ignores a product id that is not an id (e.g. a Prisma filter object)', async () => {
    (getSessionUserId as jest.Mock).mockResolvedValue('u1');
    expect(await getReviews({ productId: { not: '' } as never })).toEqual({ data: [] });
    expect(await getReviewByProductId({ productId: { not: '' } as never })).toBeNull();
    expect(db.review.findMany).not.toHaveBeenCalled();
    expect(db.review.findFirst).not.toHaveBeenCalled();
  });
});

describe('limit settings', () => {
  it('have sensible defaults', () => {
    expect(SIGN_UP_LIMIT).toEqual({ action: 'sign-up', max: 5, windowMs: 60 * 60 * 1000 });
    expect(OWNER_MESSAGE_LIMIT).toEqual({ action: 'owner-message', max: 10, windowMs: 60 * 60 * 1000 });
  });

  it('can be changed per shop in .env', () => {
    jest.isolateModules(() => {
      process.env.SIGN_UP_LIMIT_MAX = '2';
      process.env.SIGN_UP_LIMIT_MINUTES = '30';
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { SIGN_UP_LIMIT: limit } = require('@/lib/constants');
      expect(limit).toEqual({ action: 'sign-up', max: 2, windowMs: 30 * 60 * 1000 });
      delete process.env.SIGN_UP_LIMIT_MAX;
      delete process.env.SIGN_UP_LIMIT_MINUTES;
    });
  });
});
