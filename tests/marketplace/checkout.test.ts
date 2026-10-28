import { prisma } from '@/db/prisma';
import { takeDown } from '@/lib/marketplace/publish';
import { claimListingPayment, closeListing, confirmListing } from '@/lib/marketplace/checkout.actions';

jest.mock('@/lib/paypal', () => ({ paypal: {} }));
jest.mock('@/lib/marketplace/publish', () => ({ publishSubmission: jest.fn(), takeDown: jest.fn() }));
jest.mock('@/lib/marketplace/config', () => ({ LISTING_PAYMENT_METHODS: ['bizum', 'cash'], LISTING_PRICES: { normal: '5.00', big: '10.00' }, publishUrl: () => '' }));
jest.mock('@/lib/marketplace/listing-payment', () => ({ isLinkExpired: () => false, recordConsent: jest.fn() }));
jest.mock('@/db/prisma', () => ({ prisma: { submission: { findFirst: jest.fn(), update: jest.fn(async () => ({ id: 'sub-1' })) } } }));

const db = prisma as unknown as { submission: Record<'findFirst' | 'update', jest.Mock> };
const TOKEN = 'ff25bd1e-d82d-4561-8ca2-337545aa373e';

beforeEach(() => {
  jest.clearAllMocks();
  db.submission.findFirst.mockResolvedValue({ id: 'sub-1', sentAt: new Date() });
});

describe('confirmListing', () => {
  it('saves the normal plan with the person\'s OK', async () => {
    expect(await confirmListing({ token: TOKEN, plan: 'normal', hasContactConsent: true })).toEqual({ success: true });
    expect(db.submission.update.mock.calls[0][0].data).toEqual({ plan: 'normal', hasContactConsent: true });
  });

  it('refuses Premium and the extras, which are only shown as coming soon', async () => {
    expect((await confirmListing({ token: TOKEN, plan: 'big', hasContactConsent: true } as never)).success).toBe(false);
    expect((await confirmListing({ token: TOKEN, plan: 'normal', hasContactConsent: true, crossPostFacebook: true } as never)).success).toBe(false);
    expect(db.submission.update).not.toHaveBeenCalled();
  });
});

describe('claimListingPayment', () => {
  it('notes that the person says they paid, only on a confirmed listing', async () => {
    expect(await claimListingPayment(TOKEN, 'bizum')).toEqual({ success: true });
    expect(db.submission.findFirst.mock.calls[0][0].where).toMatchObject({ payToken: TOKEN, status: 'AWAITING_PAYMENT', consentAt: { not: null } });
    expect(db.submission.update.mock.calls[0][0].data).toMatchObject({ payClaimedMethod: 'bizum' });
  });

  it('refuses a method the page does not offer', async () => {
    expect((await claimListingPayment(TOKEN, 'stripe' as never)).success).toBe(false);
    expect(db.submission.update).not.toHaveBeenCalled();
  });
});

describe('closeListing', () => {
  const live = (type: string) => db.submission.findFirst.mockResolvedValue({ id: 'sub-1', type, seller: { waId: '34612345678' } });

  it('marks a live product sold with the seller\'s number, written any way', async () => {
    live('PRODUCT');
    expect(await closeListing(TOKEN, '+34 612 34 56 78')).toEqual({ success: true });
    expect(db.submission.findFirst.mock.calls[0][0].where).toMatchObject({ payToken: TOKEN, status: 'LIVE' });
    expect(takeDown).toHaveBeenCalledWith('sub-1', 'SOLD');
  });

  it('cancels a live event', async () => {
    live('EVENT');
    expect(await closeListing(TOKEN, '612345678')).toEqual({ success: true });
    expect(takeDown).toHaveBeenCalledWith('sub-1', 'CANCELLED');
  });

  it('refuses a different or too short number', async () => {
    live('PRODUCT');
    expect(await closeListing(TOKEN, '612345679')).toEqual({ success: false, isWrongPhone: true });
    expect(await closeListing(TOKEN, '345678')).toEqual({ success: false, isWrongPhone: true });
    expect(takeDown).not.toHaveBeenCalled();
  });

  it('does nothing for a link without a live listing', async () => {
    db.submission.findFirst.mockResolvedValue(null);
    expect(await closeListing(TOKEN, '612345678')).toEqual({ success: false });
    expect(takeDown).not.toHaveBeenCalled();
  });
});
