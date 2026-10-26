import { prisma } from '@/db/prisma';
import { clientIp, isSignInBlocked, recordFailedSignIn } from '@/lib/sign-in-limit';

jest.mock('@/db/prisma', () => ({
  prisma: {
    failedSignIn: { count: jest.fn(), deleteMany: jest.fn(), create: jest.fn() },
    $transaction: jest.fn(),
  },
}));

const db = prisma as unknown as {
  failedSignIn: Record<'count' | 'deleteMany' | 'create', jest.Mock>;
  $transaction: jest.Mock;
};

describe('sign-in limit', () => {
  it('lets four failed attempts through and blocks the fifth', async () => {
    db.failedSignIn.count.mockResolvedValueOnce(4).mockResolvedValueOnce(5);

    expect(await isSignInBlocked('a@b.es', '1.2.3.4')).toBe(false);
    expect(await isSignInBlocked('a@b.es', '1.2.3.4')).toBe(true);
  });

  it('only counts attempts for this email and IP within the last 15 minutes', async () => {
    db.failedSignIn.count.mockResolvedValue(0);
    const before = Date.now();

    await isSignInBlocked('a@b.es', '1.2.3.4');

    const { where } = db.failedSignIn.count.mock.calls[0][0];
    expect(where).toMatchObject({ email: 'a@b.es', ip: '1.2.3.4' });
    expect(before - where.createdAt.gt.getTime()).toBeGreaterThanOrEqual(15 * 60 * 1000 - 1000);
  });

  it('records a failure and clears out old ones in one go', async () => {
    await recordFailedSignIn('a@b.es', '1.2.3.4');

    expect(db.failedSignIn.create).toHaveBeenCalledWith({ data: { email: 'a@b.es', ip: '1.2.3.4' } });
    expect(db.$transaction).toHaveBeenCalledTimes(1);
  });

  it('reads the first IP of x-forwarded-for', () => {
    expect(clientIp(new Headers({ 'x-forwarded-for': '9.9.9.9, 10.0.0.1' }))).toBe('9.9.9.9');
    expect(clientIp(new Headers())).toBe('unknown');
  });
});
