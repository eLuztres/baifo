import { prisma } from '@/db/prisma';
import { claimUnverifiedUser, rehashLegacyPassword } from '@/lib/auth-account';
import { hash } from '@/lib/encrypt';

const tx = {
  user: { updateMany: jest.fn() },
  account: { deleteMany: jest.fn() },
  session: { deleteMany: jest.fn() },
};

jest.mock('@/db/prisma', () => ({
  prisma: {
    account: { findFirst: jest.fn(), update: jest.fn() },
    $transaction: jest.fn((run: (client: unknown) => unknown) => run(tx)),
  },
}));
jest.mock('@/lib/encrypt', () => ({
  hash: jest.fn(async () => 'scrypt$salt$key'),
  needsRehash: (storedHash: string) => !storedHash.startsWith('scrypt$'),
}));

const db = prisma as unknown as { account: Record<'findFirst' | 'update', jest.Mock> };

beforeEach(() => jest.clearAllMocks());

describe('rehashLegacyPassword', () => {
  it('stores the scrypt hash for a legacy password', async () => {
    db.account.findFirst.mockResolvedValue({ id: 'acc-1', password: 'abcdef0123' });

    await rehashLegacyPassword('user-1', 'secret1');

    expect(hash).toHaveBeenCalledWith('secret1');
    expect(db.account.update).toHaveBeenCalledWith({ where: { id: 'acc-1' }, data: { password: 'scrypt$salt$key' } });
  });

  it('leaves scrypt hashes alone', async () => {
    db.account.findFirst.mockResolvedValue({ id: 'acc-1', password: 'scrypt$old$hash' });

    await rehashLegacyPassword('user-1', 'secret1');

    expect(db.account.update).not.toHaveBeenCalled();
  });

  it('ignores a request without a password', async () => {
    await rehashLegacyPassword('user-1', undefined);

    expect(db.account.findFirst).not.toHaveBeenCalled();
  });
});

describe('claimUnverifiedUser', () => {
  it('verifies the user and drops other logins and sessions', async () => {
    tx.user.updateMany.mockResolvedValue({ count: 1 });

    await claimUnverifiedUser('user-1', 'google-acc');

    expect(tx.user.updateMany).toHaveBeenCalledWith({
      where: { id: 'user-1', emailVerified: false },
      data: { emailVerified: true },
    });
    expect(tx.account.deleteMany).toHaveBeenCalledWith({ where: { userId: 'user-1', NOT: { id: 'google-acc' } } });
    expect(tx.session.deleteMany).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
  });

  it('keeps everything for an already verified user', async () => {
    tx.user.updateMany.mockResolvedValue({ count: 0 });

    await claimUnverifiedUser('user-1', 'google-acc');

    expect(tx.account.deleteMany).not.toHaveBeenCalled();
    expect(tx.session.deleteMany).not.toHaveBeenCalled();
  });
});
