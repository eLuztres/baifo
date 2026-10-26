import { prisma } from '@/db/prisma';
import { claimInviteForSignUp, findOpenInvite } from '@/lib/invites';

jest.mock('@/db/prisma', () => ({
  prisma: { invite: { findFirst: jest.fn(), updateMany: jest.fn() } },
}));
let mockIsInviteOnly = true;
// A getter, because jest.mock runs before this file's variables exist.
jest.mock('@/lib/constants', () => ({
  get SIGN_UP_BY_INVITE() {
    return mockIsInviteOnly;
  },
  SERVER_URL: 'https://shop.test',
}));

const db = prisma as unknown as { invite: Record<'findFirst' | 'updateMany', jest.Mock> };

describe('invites', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsInviteOnly = true;
  });

  it('lets anyone sign up when the shop is not invite-only', async () => {
    mockIsInviteOnly = false;

    expect(await claimInviteForSignUp(undefined, 'ana@example.com')).toBe(true);
    expect(db.invite.updateMany).not.toHaveBeenCalled();
  });

  it('refuses a sign-up without an invite', async () => {
    expect(await claimInviteForSignUp(undefined, 'ana@example.com')).toBe(false);
    expect(db.invite.updateMany).not.toHaveBeenCalled();
  });

  it('uses up an open invite once, for the email that signed up', async () => {
    db.invite.updateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });

    expect(await claimInviteForSignUp('abc', 'ana@example.com')).toBe(true);
    expect(await claimInviteForSignUp('abc', 'ben@example.com')).toBe(false);

    const { where, data } = db.invite.updateMany.mock.calls[0][0];
    expect(where).toMatchObject({ token: 'abc', usedAt: null });
    expect(where.expiresAt.gt).toBeInstanceOf(Date);
    expect(data).toMatchObject({ usedByEmail: 'ana@example.com' });
  });

  it('only finds invites that are unused and not expired', async () => {
    db.invite.findFirst.mockResolvedValue(null);

    expect(await findOpenInvite(undefined)).toBeNull();
    await findOpenInvite('abc');

    expect(db.invite.findFirst.mock.calls[0][0].where).toMatchObject({ token: 'abc', usedAt: null });
  });
});
