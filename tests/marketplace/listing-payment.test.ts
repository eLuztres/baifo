import { Prisma } from '@prisma/client';
import { prisma } from '@/db/prisma';
import { isLinkExpired, lacksConsent, markSent, newPayCode } from '@/lib/marketplace/listing-payment';
import { getListingPreview } from '@/lib/marketplace/preview';

jest.mock('@/db/prisma', () => ({
  prisma: { submission: { findUnique: jest.fn(), updateMany: jest.fn() } },
}));

const db = (prisma as unknown as { submission: Record<'findUnique' | 'updateMany', jest.Mock> }).submission;

const TOKEN = '0b1f5a7e-2c4d-4e6f-8a9b-0c1d2e3f4a5b';
const ID = 'ff25bd1e-d82d-4561-8ca2-337545aa373e';
const NOW = new Date('2026-10-28T12:00:00Z');

beforeEach(() => jest.clearAllMocks());

describe('newPayCode', () => {
  it('is the shop name and four characters that cannot be misread', () => {
    for (let i = 0; i < 200; i++) expect(newPayCode()).toMatch(/^[A-Z]+-[A-HJKMNP-Z2-9]{4}$/);
  });

  it('draws from the random source, so codes differ', () => {
    expect(newPayCode(() => 0)).not.toBe(newPayCode(() => 0.99));
  });
});

describe('markSent', () => {
  it('draws a new code when another listing already has it', async () => {
    db.findUnique.mockResolvedValue({ payCode: null });
    const taken = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', { code: 'P2002', clientVersion: 'test' });
    db.updateMany.mockRejectedValueOnce(taken).mockResolvedValueOnce({ count: 1 });

    expect(await markSent(ID)).toBe(true);

    expect(db.updateMany).toHaveBeenCalledTimes(2);
    expect(db.updateMany).toHaveBeenLastCalledWith({
      where: { id: ID, status: { in: ['IN_REVIEW', 'AWAITING_PAYMENT'] } },
      data: { status: 'AWAITING_PAYMENT', sentAt: expect.any(Date), payCode: expect.stringMatching(/-[A-Z2-9]{4}$/) },
    });
  });

  it('keeps the code of a listing sent before', async () => {
    db.findUnique.mockResolvedValue({ payCode: 'BAIFO-7Q2K' });
    db.updateMany.mockResolvedValue({ count: 1 });

    await markSent(ID);

    expect(db.updateMany.mock.calls[0][0].data.payCode).toBe('BAIFO-7Q2K');
  });
});

describe('consent', () => {
  it('is needed for the person\'s number, not for Baifo\'s own listings', () => {
    expect(lacksConsent({ consentAt: null, seller: { waId: '34600111222' } })).toBe(true);
    expect(lacksConsent({ consentAt: NOW, seller: { waId: '34600111222' } })).toBe(false);
    expect(lacksConsent({ consentAt: null, seller: { waId: 'baifo' } })).toBe(false);
  });
});

describe('the private link', () => {
  it('works for 48 hours after it was sent', () => {
    expect(isLinkExpired(new Date('2026-10-26T12:30:00Z'), NOW)).toBe(false);
    expect(isLinkExpired(new Date('2026-10-26T12:00:00Z'), NOW)).toBe(true);
    // Waiting again after "Activar de nuevo", not sent yet.
    expect(isLinkExpired(null, NOW)).toBe(false);
  });
});

describe('getListingPreview', () => {
  const LISTING = { status: 'AWAITING_PAYMENT', sentAt: new Date('2026-10-28T08:00:00Z'), title: 'Bici de paseo', payCode: 'BAIFO-7Q2K' };

  it('never hands the seller\'s number to the page, only whether there is one', async () => {
    db.findUnique.mockResolvedValue({ ...LISTING, seller: { waId: '34612345678' } });

    expect(await getListingPreview(TOKEN, NOW)).toEqual({ ...LISTING, hasSellerPhone: true });

    const { select } = db.findUnique.mock.calls[0][0];
    expect(select.seller).toEqual({ select: { waId: true } });
    expect(JSON.stringify({ ...select, seller: undefined })).not.toMatch(/seller|waId|phone|contact|whatsapp/i);
  });

  it('has no number for a listing the admin made without one', async () => {
    db.findUnique.mockResolvedValue({ ...LISTING, seller: { waId: 'baifo' } });
    expect((await getListingPreview(TOKEN, NOW))?.hasSellerPhone).toBe(false);
  });

  it('shows nothing for an expired, closed or unknown link, nor an unpaid listing that ended', async () => {
    db.findUnique.mockResolvedValueOnce({ ...LISTING, sentAt: new Date('2026-10-25T08:00:00Z') });
    expect(await getListingPreview(TOKEN, NOW)).toBeNull();

    db.findUnique.mockResolvedValueOnce({ ...LISTING, status: 'EXPIRED' });
    expect(await getListingPreview(TOKEN, NOW)).toBeNull();

    db.findUnique.mockResolvedValueOnce(null);
    expect(await getListingPreview(TOKEN, NOW)).toBeNull();
  });

  it('stays open after the end of a paid listing, so it can be renewed', async () => {
    db.findUnique.mockResolvedValue({ ...LISTING, status: 'EXPIRED', paidAt: new Date('2026-07-01T10:00:00Z'), seller: { waId: '34612345678' } });
    expect((await getListingPreview(TOKEN, NOW))?.status).toBe('EXPIRED');

    expect(await getListingPreview('not-a-token', NOW)).toBeNull();
  });
});
