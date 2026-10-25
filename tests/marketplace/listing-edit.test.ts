import { prisma } from '@/db/prisma';
import { describeAdminListing, retryAdminListing, setAdminListingCategory, updateAdminListing } from '@/lib/marketplace/admin.actions';
import { makeListingPictures, processSubmission } from '@/lib/marketplace/processing';

jest.mock('@/lib/auth-guard', () => ({ isAdmin: jest.fn(async () => true) }));
jest.mock('@/lib/i18n-server', () => ({ getShopLocale: () => 'es' }));
jest.mock('@/lib/marketplace/processing', () => ({ processSubmission: jest.fn(), makeListingPictures: jest.fn() }));
jest.mock('@/lib/marketplace/publish', () => ({ publishByAdmin: jest.fn(), takeDown: jest.fn() }));
jest.mock('@/lib/marketplace/review', () => ({ approveSubmission: jest.fn(), rejectSubmission: jest.fn() }));
jest.mock('next/server', () => ({ after: jest.fn((run: () => void) => run()) }));
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));
jest.mock('@/db/prisma', () => ({
  prisma: {
    submission: { findUnique: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
    seller: { upsert: jest.fn(async () => ({ id: 'seller-1' })) },
    product: { update: jest.fn() },
    category: { findMany: jest.fn(async () => [{ id: 'cat-1', slug: 'motor', name: { es: 'Bicis y motor' }, keywords: [] }]) },
  },
}));

const db = prisma as unknown as {
  submission: Record<'findUnique' | 'update' | 'updateMany', jest.Mock>;
  product: Record<'update', jest.Mock>;
};

const ID = 'ff25bd1e-d82d-4561-8ca2-337545aa373e';

const EDIT = {
  title: 'Bici de paseo',
  description: 'Bici cómoda.',
  translations: { en: { title: 'City bike', description: 'Comfy bike.' } },
  category: 'motor',
  price: '80',
  images: ['https://utfs.io/f/bike.jpg'],
};

beforeEach(() => {
  jest.clearAllMocks();
  db.submission.findUnique.mockResolvedValue({ translations: { it: { title: 'Bici da città', description: 'Bici comoda.' } } });
  db.submission.update.mockResolvedValue({ productId: 'product-1' });
});

describe('updateAdminListing', () => {
  it('keeps the languages the editor did not show and updates the live product', async () => {
    expect(await updateAdminListing(ID, EDIT)).toEqual({ success: true, message: 'Guardado' });

    expect(db.submission.update.mock.calls[0][0].data.translations).toEqual({
      it: { title: 'Bici da città', description: 'Bici comoda.' },
      en: { title: 'City bike', description: 'Comfy bike.' },
    });
    expect(db.product.update.mock.calls[0][0].data).toMatchObject({
      name: 'Bici de paseo',
      category: 'Bicis y motor',
      categories: { set: [{ id: 'cat-1' }] },
    });
  });

  it('refuses a category the store does not have', async () => {
    expect((await updateAdminListing(ID, { ...EDIT, category: 'muebles' })).success).toBe(false);
    expect(db.submission.update).not.toHaveBeenCalled();
  });
});

describe('setAdminListingCategory', () => {
  it('saves the slug of the chosen category', async () => {
    await setAdminListingCategory(ID, 'Bicis y motor');
    expect(db.submission.update).toHaveBeenCalledWith({ where: { id: ID }, data: { category: 'motor' } });
  });
});

describe('describeAdminListing', () => {
  it('starts the text only once the pictures are there', async () => {
    db.submission.updateMany.mockResolvedValue({ count: 1 });

    expect((await describeAdminListing(ID, { notes: 'Bici, 80€' })).success).toBe(true);

    expect(db.submission.updateMany.mock.calls[0][0].where).toEqual({ id: ID, status: 'COLLECTING', createdByAdmin: true, images: { isEmpty: false } });
    expect(processSubmission).toHaveBeenCalledWith(ID);
  });

  it('waits while the AI still makes the pictures', async () => {
    db.submission.updateMany.mockResolvedValue({ count: 0 });

    expect((await describeAdminListing(ID, { notes: 'Bici' })).success).toBe(false);
    expect(processSubmission).not.toHaveBeenCalled();
  });
});

describe('retryAdminListing', () => {
  it('only redoes the pictures while the listing is still on the photos step', async () => {
    db.submission.findUnique.mockResolvedValue({ status: 'COLLECTING' });

    await retryAdminListing(ID);

    expect(makeListingPictures).toHaveBeenCalledWith(ID);
    expect(processSubmission).not.toHaveBeenCalled();
  });
});
