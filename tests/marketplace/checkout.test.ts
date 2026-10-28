import { headers } from 'next/headers';
import { prisma } from '@/db/prisma';
import { paypal } from '@/lib/paypal';
import { isRateLimited } from '@/lib/rate-limit';
import { publishSubmission, takeDown } from '@/lib/marketplace/publish';
import {
  captureListingPayPalOrder,
  claimListingPayment,
  closeListing,
  confirmListing,
  createListingPayPalOrder,
  startStripeCheckout,
} from '@/lib/marketplace/checkout.actions';

jest.mock('@/lib/paypal', () => ({ paypal: { createOrder: jest.fn(), capturePayment: jest.fn() } }));
jest.mock('next/headers', () => ({ headers: jest.fn() }));
jest.mock('@/lib/rate-limit', () => ({ isRateLimited: jest.fn() }));
jest.mock('@/lib/marketplace/publish', () => ({ publishSubmission: jest.fn(), takeDown: jest.fn() }));
jest.mock('@/lib/marketplace/config', () => ({ LISTING_PAYMENT_METHODS: ['bizum', 'cash'], LISTING_PRICES: { normal: '5.00', big: '10.00' }, publishUrl: () => '' }));
jest.mock('@/lib/marketplace/listing-payment', () => ({ isLinkExpired: () => false, recordConsent: jest.fn() }));
jest.mock('@/db/prisma', () => ({ prisma: { submission: { findFirst: jest.fn(), update: jest.fn(async () => ({ id: 'sub-1' })) } } }));

const db = prisma as unknown as { submission: Record<'findFirst' | 'update', jest.Mock> };
const TOKEN = 'ff25bd1e-d82d-4561-8ca2-337545aa373e';
const mockLimited = isRateLimited as jest.Mock;
const mockPaypal = paypal as unknown as Record<'createOrder' | 'capturePayment', jest.Mock>;

// Only the limit for the given action is used up.
const limitReached = (action: string) => mockLimited.mockImplementation(async (limit: { action: string }) => limit.action === action);

beforeEach(() => {
  jest.clearAllMocks();
  mockLimited.mockResolvedValue(false);
  (headers as jest.Mock).mockResolvedValue(new Headers({ 'x-forwarded-for': '9.9.9.9' }));
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

describe('rate limits on the /publicar buttons', () => {
  const CHOICE = { token: TOKEN, plan: 'normal', hasContactConsent: true } as const;

  it('counts each press per visitor IP and per link', async () => {
    await confirmListing(CHOICE);
    expect(mockLimited).toHaveBeenCalledWith(expect.objectContaining({ action: 'listing-page' }), '9.9.9.9');
    expect(mockLimited).toHaveBeenCalledWith(expect.objectContaining({ action: 'listing-link' }), TOKEN);
  });

  it.each(['listing-page', 'listing-link'])('stops confirm, Stripe, PayPal and "I paid" once %s is used up', async (action) => {
    limitReached(action);
    expect((await confirmListing(CHOICE)).success).toBe(false);
    expect((await startStripeCheckout(CHOICE)).success).toBe(false);
    expect((await createListingPayPalOrder(CHOICE)).success).toBe(false);
    expect((await claimListingPayment(TOKEN, 'bizum')).success).toBe(false);
    expect((await captureListingPayPalOrder(TOKEN, 'PAYPAL-1')).success).toBe(false);
    expect(db.submission.findFirst).not.toHaveBeenCalled();
    expect(db.submission.update).not.toHaveBeenCalled();
    expect(mockPaypal.createOrder).not.toHaveBeenCalled();
    expect(mockPaypal.capturePayment).not.toHaveBeenCalled();
  });

  it('does not count a request with an invalid token', async () => {
    expect((await closeListing('not-a-token', '612345678')).success).toBe(false);
    expect(mockLimited).not.toHaveBeenCalled();
  });

  it.each(['close-listing', 'close-listing-link'])('stops guessing the seller\'s number once %s is used up', async (action) => {
    db.submission.findFirst.mockResolvedValue({ id: 'sub-1', type: 'PRODUCT', seller: { waId: '34612345678' } });
    limitReached(action);
    expect(await closeListing(TOKEN, '612345678')).toEqual({ success: false, isTooMany: true });
    expect(db.submission.findFirst).not.toHaveBeenCalled();
    expect(takeDown).not.toHaveBeenCalled();
  });

  it('limits closing per link, whatever the IP', async () => {
    db.submission.findFirst.mockResolvedValue({ id: 'sub-1', type: 'PRODUCT', seller: { waId: '34612345678' } });
    await closeListing(TOKEN, '612345679');
    expect(mockLimited).toHaveBeenCalledWith(expect.objectContaining({ action: 'close-listing-link', max: 5 }), TOKEN);
  });
});

describe('captureListingPayPalOrder', () => {
  it('only takes the money of a listing that still waits for its fee', async () => {
    db.submission.findFirst.mockResolvedValue(null);
    expect((await captureListingPayPalOrder(TOKEN, 'PAYPAL-1')).success).toBe(false);
    expect(db.submission.findFirst.mock.calls[0][0].where).toEqual({ payToken: TOKEN, status: 'AWAITING_PAYMENT' });
    expect(mockPaypal.capturePayment).not.toHaveBeenCalled();
  });

  it('captures and publishes a waiting listing', async () => {
    mockPaypal.capturePayment.mockResolvedValue({ id: 'CAP-1', status: 'COMPLETED', purchase_units: [{ payments: { captures: [{ amount: { value: '5.00' } }] } }] });
    (publishSubmission as jest.Mock).mockResolvedValue('published');
    expect(await captureListingPayPalOrder(TOKEN, 'PAYPAL-1')).toEqual({ success: true });
    expect(publishSubmission).toHaveBeenCalledWith(expect.objectContaining({ submissionId: 'sub-1', amountPaid: '5.00' }));
  });
});
