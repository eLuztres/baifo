import { prisma } from '@/db/prisma';
import { sendText } from '@/lib/whatsapp-cloud/client';
import { enableListing, publishByAdmin, publishPaidByAdmin, publishSubmission } from '@/lib/marketplace/publish';
import { expireListings } from '@/lib/marketplace/expiry';

jest.mock('@/db/prisma', () => {
  const submission = { findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), update: jest.fn(), updateMany: jest.fn() };
  const product = { create: jest.fn(), delete: jest.fn(async () => ({})), deleteMany: jest.fn(async () => ({ count: 0 })) };
  const listingFee = { create: jest.fn() };
  return {
    prisma: {
      submission,
      product,
      listingFee,
      category: { findMany: jest.fn(async () => [{ id: 'cat-1', slug: 'bicis', name: { es: 'Bicis', en: 'Bikes' }, keywords: [] }]) },
      $transaction: jest.fn((run: (tx: unknown) => unknown) => run({ submission, product, listingFee })),
    },
  };
});
jest.mock('@/lib/whatsapp-cloud/client', () => ({ sendText: jest.fn(async () => {}) }));
jest.mock('@/lib/marketplace/listings-email', () => ({ sendListingsEmail: jest.fn(async () => {}) }));
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));
jest.mock('@/lib/places', () => ({ getDefaultPlaceId: jest.fn(async () => 'place-corralejo') }));

const db = prisma as unknown as {
  submission: Record<'findUnique' | 'findFirst' | 'findMany' | 'update' | 'updateMany', jest.Mock>;
  product: Record<'create' | 'delete' | 'deleteMany', jest.Mock>;
  listingFee: Record<'create', jest.Mock>;
};

const SUBMISSION = {
  id: 'abcdef12-0000-4000-8000-000000000000',
  status: 'AWAITING_PAYMENT',
  plan: 'big',
  title: 'Bici de paseo',
  description: 'Bici cómoda.',
  translations: { en: { title: 'City bike', description: 'Comfy bike.' } },
  category: 'bicis',
  price: '70.00',
  images: ['https://utfs.io/f/bike.jpg'],
  rawImages: [],
  hasContactConsent: true,
  crossPostFacebook: true,
  crossPostWallapop: false,
  sellerId: 'seller-1',
  seller: { waId: '34600111222', name: 'Ana' },
};

const payment = (amountPaid = '10.00') => ({ submissionId: SUBMISSION.id, provider: 'Stripe' as const, paymentId: 'pi_1', amountPaid });

beforeEach(() => {
  jest.clearAllMocks();
  db.submission.findUnique.mockResolvedValue(SUBMISSION);
  db.submission.updateMany.mockResolvedValue({ count: 1 });
  db.product.create.mockResolvedValue({ id: 'product-1', slug: 'bici-de-paseo-abcdef' });
});

describe('publishSubmission', () => {
  it('turns a paid listing into a featured product with the seller contact', async () => {
    expect(await publishSubmission(payment())).toBe('published');

    expect(db.product.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        // A listing from before places goes to the first live place.
        placeId: 'place-corralejo',
        name: 'Bici de paseo',
        slug: 'bici-de-paseo-abcdef',
        description: 'Bici cómoda.',
        translations: { en: { name: 'City bike', description: 'Comfy bike.' } },
        category: 'Bicis',
        isFeatured: true,
        contactPhone: '+34600111222',
        stock: 1,
        categories: { connect: [{ id: 'cat-1' }] },
      }),
    });
    expect(sendText).toHaveBeenCalledWith('34600111222', expect.stringContaining('online'));
  });

  it('refuses a payment that does not match the plan price', async () => {
    expect(await publishSubmission(payment('5.00'))).toBe('wrong-amount');
    expect(db.product.create).not.toHaveBeenCalled();
  });

  it('publishes only once when two payments arrive together', async () => {
    db.submission.updateMany.mockResolvedValue({ count: 0 });

    expect(await publishSubmission(payment())).toBe('already-published');
    expect(db.product.create).not.toHaveBeenCalled();
  });

  it('ignores a listing that is no longer waiting for payment', async () => {
    db.submission.findUnique.mockResolvedValue({ ...SUBMISSION, status: 'LIVE' });

    expect(await publishSubmission(payment())).toBe('already-published');
  });
});

describe('publishByAdmin', () => {
  it('publishes a listing under review without payment, with the chosen plan', async () => {
    db.submission.update.mockResolvedValue({ ...SUBMISSION, status: 'IN_REVIEW', plan: 'normal', createdByAdmin: true });

    expect(await publishByAdmin(SUBMISSION.id, 'normal')).toEqual({ id: 'product-1', slug: 'bici-de-paseo-abcdef' });

    expect(db.submission.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: SUBMISSION.id, status: { in: ['IN_REVIEW', 'AWAITING_PAYMENT'] } } })
    );
    expect(db.product.create).toHaveBeenCalledWith({ data: expect.objectContaining({ isFeatured: false }) });
  });
});

describe('publishPaidByAdmin', () => {
  const CASH = { method: 'cash' as const, amount: '5.00', recordedBy: 'jose@example.com' };

  it('refuses a listing with the person\'s number until they agreed to show it', async () => {
    db.submission.findFirst.mockResolvedValue({ ...SUBMISSION, consentAt: null });

    expect(await publishPaidByAdmin(SUBMISSION.id, 'normal', CASH)).toBe('no-consent');
    expect(db.product.create).not.toHaveBeenCalled();
    expect(db.listingFee.create).not.toHaveBeenCalled();
  });

  it('books the fee and publishes once the person agreed', async () => {
    const agreed = { ...SUBMISSION, consentAt: new Date('2026-10-28T09:00:00Z'), payCode: 'BAIFO-7Q2K' };
    db.submission.findFirst.mockResolvedValue(agreed);
    db.submission.update.mockResolvedValue({ ...agreed, plan: 'normal' });

    expect(await publishPaidByAdmin(SUBMISSION.id, 'normal', CASH)).toBe('published');

    expect(db.listingFee.create).toHaveBeenCalledWith({
      data: { submissionId: SUBMISSION.id, title: 'Bici de paseo', method: 'cash', amount: '5.00', payCode: 'BAIFO-7Q2K', recordedBy: 'jose@example.com' },
    });
    expect(db.product.create).toHaveBeenCalledWith({ data: expect.objectContaining({ contactPhone: '+34600111222', isFeatured: false }) });
  });

  it('publishes Baifo\'s own listings without asking for consent', async () => {
    const house = { ...SUBMISSION, consentAt: null, seller: { waId: 'baifo', name: null } };
    db.submission.findFirst.mockResolvedValue(house);
    db.submission.update.mockResolvedValue(house);

    expect(await publishPaidByAdmin(SUBMISSION.id, 'big', { method: 'bizum', amount: '10.00' })).toBe('published');
  });
});

describe('expireListings', () => {
  it('takes ended listings down and reminds those ending within a week once', async () => {
    const now = new Date('2026-10-23T10:00:00Z');
    db.submission.findMany
      .mockResolvedValueOnce([{ ...SUBMISSION, id: 'old', status: 'LIVE' }])
      .mockResolvedValueOnce([{ ...SUBMISSION, id: 'soon', status: 'LIVE', expiresAt: new Date('2026-10-27T10:00:00Z') }]);
    db.submission.update.mockImplementation(async ({ where }) => ({ id: where.id, productId: `product-${where.id}` }));
    db.submission.updateMany.mockResolvedValueOnce({ count: 0 });

    expect(await expireListings(now)).toEqual({ expired: 1, unpaid: 0, reminded: 1 });

    expect(db.submission.update).toHaveBeenCalledWith({ where: { id: 'old' }, data: { status: 'EXPIRED' } });
    expect(db.product.delete).toHaveBeenCalledWith({ where: { id: 'product-old' } });
    expect(db.submission.update).toHaveBeenCalledWith({ where: { id: 'soon' }, data: { remindedAt: now } });
    expect(sendText).toHaveBeenCalledWith('34600111222', expect.stringContaining('27/10/2026'));
  });

  it('takes ended services down, which an admin published without a submission', async () => {
    const now = new Date('2026-10-23T10:00:00Z');
    db.submission.findMany.mockResolvedValue([]);
    db.product.deleteMany.mockResolvedValueOnce({ count: 2 });
    db.submission.updateMany.mockResolvedValueOnce({ count: 0 });

    expect(await expireListings(now)).toEqual({ expired: 2, unpaid: 0, reminded: 0 });

    expect(db.product.deleteMany).toHaveBeenCalledWith({ where: { type: 'SERVICE', submission: null, expiresAt: { lte: now } } });
  });
});

describe('unpaid listings', () => {
  it('expire UNPAID_LISTING_HOURS (48) after the link was sent, keeping everything', async () => {
    const now = new Date('2026-10-23T10:00:00Z');
    db.submission.findMany.mockResolvedValue([]);
    db.submission.updateMany.mockResolvedValueOnce({ count: 3 });

    expect(await expireListings(now)).toEqual({ expired: 0, unpaid: 3, reminded: 0 });

    expect(db.submission.updateMany).toHaveBeenCalledWith({
      where: { status: 'AWAITING_PAYMENT', sentAt: { lte: new Date('2026-10-21T10:00:00Z') } },
      data: { status: 'EXPIRED' },
    });
    expect(db.product.delete).not.toHaveBeenCalled();
  });
});

describe('enableListing', () => {
  it('puts a listing that was live online again from what it kept, for a new period', async () => {
    db.submission.findFirst.mockResolvedValue({ ...SUBMISSION, status: 'EXPIRED', paidAt: new Date('2026-07-01T10:00:00Z') });

    expect(await enableListing(SUBMISSION.id)).toBe('live');

    expect(db.submission.updateMany).toHaveBeenCalledWith({
      where: { id: SUBMISSION.id, status: { in: ['EXPIRED'] } },
      data: expect.objectContaining({ status: 'LIVE', remindedAt: null, expiresAt: expect.any(Date) }),
    });
    expect(db.product.create).toHaveBeenCalledWith({ data: expect.objectContaining({ slug: 'bici-de-paseo-abcdef', images: SUBMISSION.images }) });
  });

  it('sends a listing that was never paid back to waiting for its payment', async () => {
    db.submission.findFirst.mockResolvedValue({ ...SUBMISSION, status: 'EXPIRED', paidAt: null });

    expect(await enableListing(SUBMISSION.id)).toBe('waiting');

    expect(db.submission.updateMany).toHaveBeenCalledWith({ where: { id: SUBMISSION.id, status: 'EXPIRED' }, data: { status: 'AWAITING_PAYMENT', sentAt: null } });
    expect(db.product.create).not.toHaveBeenCalled();
  });

  it('does nothing for a listing that is not expired', async () => {
    db.submission.findFirst.mockResolvedValue(null);

    expect(await enableListing(SUBMISSION.id)).toBeNull();
    expect(db.submission.updateMany).not.toHaveBeenCalled();
  });
});
