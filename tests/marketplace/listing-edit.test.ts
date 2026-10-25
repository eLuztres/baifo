import { prisma } from '@/db/prisma';
import {
  chooseListingText,
  createAdminListing,
  createAdminListingPicture,
  describeAdminListing,
  retryAdminListing,
  setAdminListingCategory,
  updateAdminListing,
} from '@/lib/marketplace/admin.actions';
import { createPicture, translateText, writeListing } from '@/lib/marketplace/ai';
import { makeListingPictures, processSubmission } from '@/lib/marketplace/processing';

jest.mock('@/lib/auth-guard', () => ({ isAdmin: jest.fn(async () => true) }));
jest.mock('@/lib/i18n-server', () => ({ getShopLocale: () => 'es', getEnabledLocales: () => ['es', 'en'] }));
jest.mock('@/lib/marketplace/ai', () => ({ translateText: jest.fn(), writeListing: jest.fn(), createPicture: jest.fn(async () => Buffer.from('')) }));
jest.mock('@/lib/marketplace/media', () => ({
  fetchImage: jest.fn(async () => Buffer.from('')),
  uploadImage: jest.fn(async () => 'https://x.ufs.sh/f/made.jpg'),
}));
jest.mock('@/lib/marketplace/processing', () => ({ processSubmission: jest.fn(), makeListingPictures: jest.fn() }));
jest.mock('@/lib/marketplace/publish', () => ({ publishByAdmin: jest.fn(), takeDown: jest.fn() }));
jest.mock('@/lib/marketplace/review', () => ({ approveSubmission: jest.fn(), rejectSubmission: jest.fn() }));
jest.mock('next/server', () => ({ after: jest.fn((run: () => void) => run()) }));
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));
jest.mock('@/db/prisma', () => ({
  prisma: {
    submission: { findUnique: jest.fn(), update: jest.fn(), updateMany: jest.fn(), create: jest.fn(async () => ({ id: 'new-1' })) },
    seller: { upsert: jest.fn(async () => ({ id: 'seller-1' })) },
    product: { update: jest.fn() },
    category: { findMany: jest.fn(async () => [{ id: 'cat-1', slug: 'motor', name: { es: 'Bicis y motor' }, keywords: [] }]) },
  },
}));

const db = prisma as unknown as {
  submission: Record<'findUnique' | 'update' | 'updateMany' | 'create', jest.Mock>;
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
  beforeEach(() => db.submission.findUnique.mockResolvedValue({ kind: 'product', rawImages: ['https://utfs.io/f/bike.jpg'] }));

  it('starts the text only once the pictures are there', async () => {
    db.submission.updateMany.mockResolvedValue({ count: 1 });

    expect((await describeAdminListing(ID, { notes: 'Bici, 80€' })).success).toBe(true);

    expect(db.submission.updateMany.mock.calls[0][0].where).toEqual({
      id: ID,
      status: 'COLLECTING',
      createdByAdmin: true,
      OR: [{ images: { isEmpty: false } }, { rawImages: { isEmpty: true } }],
    });
    expect(processSubmission).toHaveBeenCalledWith(ID);
  });

  it('needs a description when there is no photo, because the AI makes the picture from it', async () => {
    db.submission.findUnique.mockResolvedValue({ kind: 'product', rawImages: [] });

    expect((await describeAdminListing(ID, { notes: '' })).success).toBe(false);
    expect(db.submission.updateMany).not.toHaveBeenCalled();
  });

  it('waits while the AI still makes the pictures', async () => {
    db.submission.updateMany.mockResolvedValue({ count: 0 });

    expect((await describeAdminListing(ID, { notes: 'Bici' })).success).toBe(false);
    expect(processSubmission).not.toHaveBeenCalled();
  });
});

describe('createAdminListing', () => {
  it('starts a wanted ad without photos: a product marked wanted, and no pictures to make yet', async () => {
    const result = await createAdminListing({ photos: [], kind: 'wanted' });

    expect(result).toMatchObject({ success: true, id: 'new-1' });
    expect(db.submission.create.mock.calls[0][0].data).toMatchObject({ rawImages: [], kind: 'product', isWanted: true });
    expect(makeListingPictures).not.toHaveBeenCalled();
  });

  it('makes the pictures right away when there are photos', async () => {
    await createAdminListing({ photos: ['https://utfs.io/f/bike.jpg'], kind: 'service' });

    expect(db.submission.create.mock.calls[0][0].data).toMatchObject({ kind: 'service', isWanted: false });
    expect(makeListingPictures).toHaveBeenCalledWith('new-1');
  });
});

describe('createAdminListingPicture', () => {
  it('makes a picture from the listing text when the admin typed nothing', async () => {
    db.submission.findUnique.mockResolvedValue({ title: 'Busco tabla', description: 'Una tabla de 7 pies.', kind: 'product', isWanted: true });

    expect(await createAdminListingPicture(ID)).toEqual({ success: true, message: '', url: 'https://x.ufs.sh/f/made.jpg' });
    expect(createPicture).toHaveBeenCalledWith({ title: 'Busco tabla', description: 'Una tabla de 7 pies.' }, 'product', true);
  });

  it('uses what the admin typed instead', async () => {
    db.submission.findUnique.mockResolvedValue({ title: 'Clases de surf', description: '', kind: 'service', isWanted: false });

    await createAdminListingPicture(ID, 'surf lesson at sunrise');
    expect(createPicture).toHaveBeenCalledWith({ title: 'surf lesson at sunrise', description: '' }, 'service', false);
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

describe('text versions', () => {
  const OWN = { es: { title: 'Mi bici', description: 'bici comoda' }, en: { title: 'My bike', description: 'comfy bike' } };

  it('saves an edit into the version in use, so switching back brings it again', async () => {
    db.submission.findUnique.mockResolvedValue({ translations: {}, textMode: 'ai', textVersions: { original: OWN } });

    await updateAdminListing(ID, { ...EDIT, textMode: 'ai' });

    expect(db.submission.update.mock.calls[0][0].data.textVersions).toEqual({
      original: OWN,
      ai: { es: { title: 'Bici de paseo', description: 'Bici cómoda.' }, en: { title: 'City bike', description: 'Comfy bike.' } },
    });
  });

  it('lets a save from before a switch update only its own version, never the text in use', async () => {
    db.submission.findUnique.mockResolvedValue({ translations: {}, textMode: 'original', textVersions: {} });

    await updateAdminListing(ID, { ...EDIT, textMode: 'ai' });

    expect(db.submission.update).toHaveBeenCalledTimes(1);
    expect(Object.keys(db.submission.update.mock.calls[0][0].data)).toEqual(['textVersions']);
    expect(db.product.update).not.toHaveBeenCalled();
  });

  it('brings back a version made before without asking the AI again', async () => {
    db.submission.findUnique.mockResolvedValue({ textVersions: { original: OWN }, rawText: 'bici comoda' });

    expect(await chooseListingText(ID, 'original')).toMatchObject({ success: true, texts: OWN });
    expect(translateText).not.toHaveBeenCalled();
    expect(writeListing).not.toHaveBeenCalled();
    expect(db.submission.update.mock.calls[0][0].data.textMode).toBe('original');
  });

  it('translates the admin\'s own words the first time the original is chosen', async () => {
    db.submission.findUnique.mockResolvedValue({ textVersions: {}, rawText: 'bici comoda', originalTitle: 'Mi bici', title: 'Bici de paseo' });
    (translateText as jest.Mock).mockResolvedValue({ en: OWN.en });

    expect(await chooseListingText(ID, 'original')).toMatchObject({ texts: OWN });
    expect(translateText).toHaveBeenCalledWith(OWN.es, 'es', ['en']);
  });

  it('refuses "my text as is" without a text', async () => {
    expect((await describeAdminListing(ID, { notes: '  ', textMode: 'original' })).success).toBe(false);
    expect(db.submission.updateMany).not.toHaveBeenCalled();
  });
});
