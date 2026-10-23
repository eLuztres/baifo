import { prisma } from '@/db/prisma';
import { sendText } from '@/lib/whatsapp-cloud/client';
import { publishSubmission } from '@/lib/marketplace/publish';
import { expireListings } from '@/lib/marketplace/expiry';

jest.mock('@/db/prisma', () => {
  const submission = { findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn(), updateMany: jest.fn() };
  const product = { create: jest.fn(), delete: jest.fn(async () => ({})) };
  return {
    prisma: {
      submission,
      product,
      category: { findMany: jest.fn(async () => [{ id: 'cat-1', name: { es: 'Bicis' } }]) },
      $transaction: jest.fn((run: (tx: unknown) => unknown) => run({ submission, product })),
    },
  };
});
jest.mock('@/lib/whatsapp-cloud/client', () => ({ sendText: jest.fn(async () => {}) }));
jest.mock('@/lib/marketplace/listings-email', () => ({ sendListingsEmail: jest.fn(async () => {}) }));
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));

const db = prisma as unknown as {
  submission: Record<'findUnique' | 'findMany' | 'update' | 'updateMany', jest.Mock>;
  product: Record<'create' | 'delete', jest.Mock>;
};

const SUBMISSION = {
  id: 'abcdef12-0000-4000-8000-000000000000',
  status: 'AWAITING_PAYMENT',
  plan: 'big',
  title: 'Bici de paseo',
  description: 'Bici cómoda.',
  descriptionEn: 'Comfy bike.',
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
        name: 'Bici de paseo',
        slug: 'bici-de-paseo-abcdef',
        description: 'Bici cómoda.\n\n🇬🇧 Comfy bike.',
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

describe('expireListings', () => {
  it('takes ended listings down and reminds those ending within a week once', async () => {
    const now = new Date('2026-10-23T10:00:00Z');
    db.submission.findMany
      .mockResolvedValueOnce([{ ...SUBMISSION, id: 'old', status: 'LIVE' }])
      .mockResolvedValueOnce([{ ...SUBMISSION, id: 'soon', status: 'LIVE', expiresAt: new Date('2026-10-27T10:00:00Z') }]);
    db.submission.update.mockImplementation(async ({ where }) => ({ id: where.id, productId: `product-${where.id}` }));

    expect(await expireListings(now)).toEqual({ expired: 1, reminded: 1 });

    expect(db.submission.update).toHaveBeenCalledWith({ where: { id: 'old' }, data: { status: 'EXPIRED' } });
    expect(db.product.delete).toHaveBeenCalledWith({ where: { id: 'product-old' } });
    expect(db.submission.update).toHaveBeenCalledWith({ where: { id: 'soon' }, data: { remindedAt: now } });
    expect(sendText).toHaveBeenCalledWith('34600111222', expect.stringContaining('27/10/2026'));
  });
});
