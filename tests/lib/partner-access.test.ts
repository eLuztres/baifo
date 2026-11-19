import { prisma } from '@/db/prisma';
import { isAdmin } from '@/lib/auth-guard';
import { hasPartnerRoom, listingEditor, PARTNER_ACTIVE_STATUSES } from '@/lib/partner-access';

const cookieJar = new Map<string, string>();

jest.mock('react', () => ({ ...jest.requireActual('react'), cache: <T,>(run: T) => run }));
jest.mock('next/headers', () => ({ cookies: async () => ({ get: (name: string) => (cookieJar.has(name) ? { value: cookieJar.get(name) } : undefined) }) }));
jest.mock('@/lib/auth-guard', () => ({ isAdmin: jest.fn(async () => false) }));
jest.mock('@/db/prisma', () => ({
  prisma: {
    partner: { findUnique: jest.fn() },
    submission: { findUnique: jest.fn(), count: jest.fn() },
  },
}));

const db = prisma as unknown as {
  partner: Record<'findUnique', jest.Mock>;
  submission: Record<'findUnique' | 'count', jest.Mock>;
};
const MAGMA = { id: 'partner-magma', token: 'magma-secret-token-0123456789', maxListings: 20 };
const LISTING_ID = '11111111-0000-4000-8000-000000000000';

beforeEach(() => {
  jest.clearAllMocks();
  cookieJar.clear();
  (isAdmin as jest.Mock).mockResolvedValue(false);
  db.partner.findUnique.mockImplementation(async ({ where }: { where: { token: string } }) => (where.token === MAGMA.token ? MAGMA : null));
});

describe('listingEditor', () => {
  it('lets the admin edit any listing', async () => {
    (isAdmin as jest.Mock).mockResolvedValue(true);
    expect(await listingEditor(LISTING_ID)).toBe('admin');
  });

  it('lets a partner edit only its own mercadillo’s listing', async () => {
    cookieJar.set('baifo_mercadillo', MAGMA.token);
    db.submission.findUnique.mockResolvedValue({ partnerId: MAGMA.id });
    expect(await listingEditor(LISTING_ID)).toBe('partner');
    db.submission.findUnique.mockResolvedValue({ partnerId: 'partner-other' });
    expect(await listingEditor(LISTING_ID)).toBeNull();
    db.submission.findUnique.mockResolvedValue({ partnerId: null });
    expect(await listingEditor(LISTING_ID)).toBeNull();
  });

  it('refuses a browser with an old link or none', async () => {
    expect(await listingEditor(LISTING_ID)).toBeNull();
    cookieJar.set('baifo_mercadillo', 'an-old-token-that-was-renewed');
    expect(await listingEditor(LISTING_ID)).toBeNull();
    expect(db.submission.findUnique).not.toHaveBeenCalled();
  });
});

describe('hasPartnerRoom', () => {
  it('counts only listings that take a place, without the one being checked', async () => {
    db.submission.count.mockResolvedValue(19);
    expect(await hasPartnerRoom(MAGMA, LISTING_ID)).toBe(true);
    expect(db.submission.count).toHaveBeenCalledWith({ where: { partnerId: MAGMA.id, status: { in: PARTNER_ACTIVE_STATUSES }, id: { not: LISTING_ID } } });
    db.submission.count.mockResolvedValue(20);
    expect(await hasPartnerRoom(MAGMA)).toBe(false);
  });
});
