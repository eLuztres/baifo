import { prisma } from '@/db/prisma';
import {
  addAdminVideoStill,
  chooseListingText,
  createAdminListing,
  createAdminListingPicture,
  deleteAdminListing,
  describeAdminListing,
  extendAdminListing,
  hideAdminListing,
  markAdminListingSold,
  publishAdminListing,
  retryAdminListing,
  setAdminListingCategory,
  updateAdminListing,
  updateAdminListingPhotos,
} from '@/lib/marketplace/admin.actions';
import { correctText, createPicture, enhancePhoto, translateText, writeListing } from '@/lib/marketplace/ai';
import { makeListingPictures, processSubmission } from '@/lib/marketplace/processing';
import { publishByAdmin, takeDown } from '@/lib/marketplace/publish';
import { takeVideoStill } from '@/lib/marketplace/video-cleanup';

jest.mock('@/lib/auth-guard', () => ({ isAdmin: jest.fn(async () => true) }));
jest.mock('@/lib/i18n-server', () => ({ getShopLocale: () => 'es', getEnabledLocales: () => ['es', 'en'] }));
jest.mock('@/lib/marketplace/ai', () => ({
  correctText: jest.fn(),
  translateText: jest.fn(),
  writeListing: jest.fn(),
  createPicture: jest.fn(async () => Buffer.from('')),
  enhancePhoto: jest.fn(async () => Buffer.from('')),
}));
jest.mock('@/lib/places', () => ({
  getShopPlaces: jest.fn(async () => [
    { id: 'place-1', slug: 'corralejo', name: 'Corralejo', isLive: true },
    { id: 'place-2', slug: 'el-cotillo', name: 'El Cotillo', isLive: true },
  ]),
}));
jest.mock('@/lib/marketplace/media', () => ({
  fetchImage: jest.fn(async () => Buffer.from('')),
  uploadImage: jest.fn(async () => 'https://x.ufs.sh/f/made.jpg'),
}));
jest.mock('@/lib/marketplace/video-cleanup', () => ({ takeVideoStill: jest.fn(async () => Buffer.from('jpg')) }));
jest.mock('@/lib/marketplace/processing', () => ({ processSubmission: jest.fn(), makeListingPictures: jest.fn() }));
jest.mock('@/lib/marketplace/publish', () => ({ publishByAdmin: jest.fn(), takeDown: jest.fn() }));
jest.mock('@/lib/marketplace/review', () => ({ approveSubmission: jest.fn(), rejectSubmission: jest.fn() }));
jest.mock('next/server', () => ({ after: jest.fn((run: () => void) => run()) }));
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));
jest.mock('@/db/prisma', () => ({
  prisma: {
    submission: { findUnique: jest.fn(), findFirst: jest.fn(), update: jest.fn(), updateMany: jest.fn(), create: jest.fn(async () => ({ id: 'new-1' })), delete: jest.fn(() => 'delete-submission') },
    seller: { upsert: jest.fn(async () => ({ id: 'seller-1' })) },
    product: { update: jest.fn(), delete: jest.fn(() => 'delete-product') },
    category: { findMany: jest.fn(async () => [{ id: 'cat-1', slug: 'motor', name: { es: 'Bicis y motor' }, keywords: [] }]) },
    $transaction: jest.fn(async (writes: unknown[]) => writes),
  },
}));

const db = prisma as unknown as {
  submission: Record<'findUnique' | 'findFirst' | 'update' | 'updateMany' | 'create' | 'delete', jest.Mock>;
  seller: Record<'upsert', jest.Mock>;
  product: Record<'update' | 'delete', jest.Mock>;
  $transaction: jest.Mock;
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

  it('keeps the seller\'s number, name, language and photos as they are', async () => {
    db.submission.findUnique.mockResolvedValue({ translations: {}, type: 'PRODUCT', status: 'IN_REVIEW', seller: { waId: '34600111222' } });
    // An older editor still sending them changes nothing either; the same number changes nothing too.
    const oldEdit = { ...EDIT, sellerPhone: '600 111 222', sellerName: 'Lula', sellerLocale: 'de' } as typeof EDIT;

    expect((await updateAdminListing(ID, oldEdit)).success).toBe(true);
    expect(db.seller.upsert).not.toHaveBeenCalled();
    const { data } = db.submission.update.mock.calls[0][0];
    for (const kept of ['sellerId', 'sellerName', 'sellerLocale', 'hasContactConsent', 'consentAt', 'rawImages']) expect(data).not.toHaveProperty(kept);
    expect(data.images).toEqual(EDIT.images);
  });

  it('moves the listing and its product to a new number, checked like the seller\'s own change', async () => {
    db.$transaction.mockImplementationOnce(async (run: (tx: unknown) => unknown) => run(prisma));
    const live = { translations: {}, type: 'PRODUCT', productId: 'product-1', hasContactConsent: true, seller: { waId: '34600111222', name: 'Ana' } };
    db.submission.findUnique.mockResolvedValue(live);

    expect((await updateAdminListing(ID, { ...EDIT, sellerPhone: '0049 151 1234 5678' })).success).toBe(true);
    expect(db.seller.upsert.mock.calls[0][0]).toMatchObject({ where: { waId: '4915112345678' }, create: { waId: '4915112345678', name: 'Ana' } });
    expect(db.submission.update.mock.calls[0][0]).toEqual({ where: { id: ID }, data: { sellerId: 'seller-1' } });
    expect(db.product.update.mock.calls[0][0].data).toEqual({ sellerId: 'seller-1', contactPhone: '+4915112345678' });
  });

  it('refuses a broken number, and taking a person\'s number away; a house listing may stay without one', async () => {
    db.submission.findUnique.mockResolvedValue({ translations: {}, type: 'PRODUCT', seller: { waId: '34600111222', name: null } });
    expect((await updateAdminListing(ID, { ...EDIT, sellerPhone: '12' })).message).toBe('Revisa el teléfono');
    expect((await updateAdminListing(ID, { ...EDIT, sellerPhone: '' })).message).toBe('Escribe su WhatsApp');
    expect(db.submission.update).not.toHaveBeenCalled();

    db.submission.findUnique.mockResolvedValue({ translations: {}, type: 'PRODUCT', seller: { waId: 'baifo', name: null } });
    expect((await updateAdminListing(ID, { ...EDIT, sellerPhone: '' })).success).toBe(true);
    expect(db.seller.upsert).not.toHaveBeenCalled();
  });

  it('gives a house listing its first number, a Spanish one getting +34', async () => {
    db.$transaction.mockImplementationOnce(async (run: (tx: unknown) => unknown) => run(prisma));
    db.submission.findUnique.mockResolvedValue({ translations: {}, type: 'PRODUCT', productId: null, hasContactConsent: false, seller: { waId: 'baifo', name: null } });

    expect((await updateAdminListing(ID, { ...EDIT, sellerPhone: '611 222 333' })).success).toBe(true);
    expect(db.seller.upsert.mock.calls[0][0].where).toEqual({ waId: '34611222333' });
  });

  it('keeps a live listing online a month longer, counted from its end', async () => {
    db.submission.findFirst.mockResolvedValue({ expiresAt: new Date('2026-12-10T12:00:00Z'), productId: 'product-1' });

    expect((await extendAdminListing(ID)).success).toBe(true);
    expect(db.submission.update.mock.calls[0][0].data.expiresAt).toEqual(new Date('2027-01-10T12:00:00Z'));
    expect(db.product.update.mock.calls[0][0].data.expiresAt).toEqual(new Date('2027-01-10T12:00:00Z'));

    db.submission.findFirst.mockResolvedValue(null);
    expect((await extendAdminListing(ID)).success).toBe(false);
  });

  it('lets a service go without a "from" price and keeps its kind of offer', async () => {
    db.submission.findUnique.mockResolvedValue({ translations: {}, type: 'SERVICE' });

    expect((await updateAdminListing(ID, { ...EDIT, price: '', serviceType: 'class' })).success).toBe(true);
    expect(db.submission.update.mock.calls[0][0].data).toMatchObject({ price: null, serviceType: 'class' });
    expect(db.product.update.mock.calls[0][0].data).toMatchObject({ price: 0, serviceType: 'class' });
  });

  it('needs an event\'s date and stores it on the island\'s clock', async () => {
    db.submission.findUnique.mockResolvedValue({ translations: {}, type: 'EVENT' });

    expect((await updateAdminListing(ID, { ...EDIT, price: '0', startsAt: '' })).success).toBe(false);
    expect((await updateAdminListing(ID, { ...EDIT, price: '0', startsAt: 'mañana' })).success).toBe(false);
    expect((await updateAdminListing(ID, { ...EDIT, price: '0', startsAt: '2026-11-26T19:00', address: 'Plaza de Lajares' })).success).toBe(true);
    expect(db.product.update.mock.calls[0][0].data).toMatchObject({
      price: '0.00',
      startsAt: new Date('2026-11-26T19:00:00Z'),
      address: 'Plaza de Lajares',
    });
  });

  describe('switching the type', () => {
    const FULL = { ...EDIT, priceMax: '120', condition: 'good', serviceType: 'class', startsAt: '2026-11-26T19:00', address: 'Plaza de Lajares' } as const;

    it('turns a live product into an event: the product follows, what only fits goods goes', async () => {
      db.submission.findUnique.mockResolvedValue({ translations: {}, type: 'PRODUCT' });
      db.submission.update.mockResolvedValue({ productId: 'product-1', type: 'EVENT' });

      expect((await updateAdminListing(ID, { ...FULL, type: 'EVENT' })).success).toBe(true);
      expect(db.submission.update.mock.calls[0][0].data).toMatchObject({ type: 'EVENT', condition: null, serviceType: null, priceMax: null, address: 'Plaza de Lajares' });
      expect(db.product.update.mock.calls[0][0].data).toMatchObject({ type: 'EVENT', startsAt: new Date('2026-11-26T19:00:00Z'), condition: null, name: 'Bici de paseo' });
    });

    it('turns an event into a wanted ad: its date and address go, it has no condition, the budget range stays', async () => {
      db.submission.findUnique.mockResolvedValue({ translations: {}, type: 'EVENT' });
      db.submission.update.mockResolvedValue({ productId: 'product-1', type: 'WANTED' });

      expect((await updateAdminListing(ID, { ...FULL, price: '', condition: 'any', type: 'WANTED' })).success).toBe(true);
      expect(db.submission.update.mock.calls[0][0].data).toMatchObject({ type: 'WANTED', startsAt: null, address: null, price: null, priceMax: '120.00', condition: null });
      expect(db.product.update.mock.calls[0][0].data).toMatchObject({ type: 'WANTED', startsAt: null, priceMax: '120.00', condition: null });
    });

    it('turns a wanted ad into a service without a price, keeping its kind of offer', async () => {
      db.submission.findUnique.mockResolvedValue({ translations: {}, type: 'WANTED' });

      expect((await updateAdminListing(ID, { ...FULL, price: '', type: 'SERVICE' })).success).toBe(true);
      expect(db.submission.update.mock.calls[0][0].data).toMatchObject({ type: 'SERVICE', serviceType: 'class', priceMax: null, condition: null, startsAt: null });
    });

    it('turns a service back into a product', async () => {
      db.submission.findUnique.mockResolvedValue({ translations: {}, type: 'SERVICE' });

      expect((await updateAdminListing(ID, { ...FULL, type: 'PRODUCT' })).success).toBe(true);
      expect(db.submission.update.mock.calls[0][0].data).toMatchObject({ type: 'PRODUCT', price: '80.00', condition: 'good', serviceType: null, priceMax: null });
    });

    it('checks the edit for the new type', async () => {
      db.submission.findUnique.mockResolvedValue({ translations: {}, type: 'PRODUCT' });

      // An event needs its date, a product a price, and "any condition" only fits a wanted ad.
      expect((await updateAdminListing(ID, { ...EDIT, type: 'EVENT' })).success).toBe(false);
      db.submission.findUnique.mockResolvedValue({ translations: {}, type: 'SERVICE' });
      expect((await updateAdminListing(ID, { ...EDIT, price: '', type: 'PRODUCT' })).success).toBe(false);
      expect((await updateAdminListing(ID, { ...EDIT, condition: 'any', type: 'PRODUCT' })).success).toBe(false);
      expect((await updateAdminListing(ID, { ...EDIT, type: 'CAR' as 'PRODUCT' })).success).toBe(false);
      expect(db.submission.update).not.toHaveBeenCalled();
    });
  });

  it('takes a kind of offer away from anything that is not a service', async () => {
    db.submission.findUnique.mockResolvedValue({ translations: {}, type: 'PRODUCT' });

    expect((await updateAdminListing(ID, { ...EDIT, serviceType: 'class' })).success).toBe(true);
    expect(db.submission.update.mock.calls[0][0].data).toMatchObject({ serviceType: null, priceMax: null });
  });

  it('keeps a budget range only on a wanted ad, and no condition', async () => {
    db.submission.findUnique.mockResolvedValue({ translations: {}, type: 'WANTED' });

    expect((await updateAdminListing(ID, { ...EDIT, price: '50', priceMax: '90', condition: 'any' })).success).toBe(true);
    expect(db.submission.update.mock.calls[0][0].data).toMatchObject({ price: '50.00', priceMax: '90.00', condition: null });
  });

  it('saves the same pictures in the same order when the category changes back and forth (card 293)', async () => {
    const categories = (prisma as unknown as { category: Record<'findMany', jest.Mock> }).category.findMany;
    categories.mockResolvedValue([
      { id: 'cat-1', slug: 'motor', name: { es: 'Bicis y motor' }, keywords: [] },
      { id: 'cat-2', slug: 'deporte', name: { es: 'Deporte' }, keywords: [] },
    ]);
    const images = ['https://utfs.io/f/second.jpg', 'https://utfs.io/f/first-ai.jpg', 'https://utfs.io/f/clip.mp4'];

    for (const category of ['deporte', 'motor', 'deporte']) await updateAdminListing(ID, { ...EDIT, category, images });

    expect(db.submission.update.mock.calls.map(([call]) => call.data.images)).toEqual([images, images, images]);
    expect(db.submission.update.mock.calls.every(([call]) => !('aiImages' in call.data) && !('rawImages' in call.data))).toBe(true);
    expect(db.product.update.mock.calls.map(([call]) => call.data.images)).toEqual([images, images, images]);
  });

  it('refuses a budget range whose upper end is not above its lower end', async () => {
    db.submission.findUnique.mockResolvedValue({ translations: {}, type: 'WANTED' });

    for (const priceMax of ['50', '40']) {
      expect(await updateAdminListing(ID, { ...EDIT, price: '50', priceMax, condition: 'any' })).toEqual({ success: false, message: 'Hasta tiene que ser más que Desde' });
    }
    expect(db.submission.update).not.toHaveBeenCalled();
  });

  it('saves a wanted ad with only an upper end, and its empty lower end as none', async () => {
    db.submission.findUnique.mockResolvedValue({ translations: {}, type: 'WANTED' });

    expect((await updateAdminListing(ID, { ...EDIT, price: '', priceMax: '60', condition: 'any' })).success).toBe(true);
    expect(db.submission.update.mock.calls[0][0].data).toMatchObject({ price: null, priceMax: '60.00' });
    expect(db.product.update.mock.calls[0][0].data).toMatchObject({ price: 0, priceMax: '60.00' });
    expect((await updateAdminListing(ID, { ...EDIT, price: '', priceMax: '', condition: 'any' })).success).toBe(false);
  });

  it('still needs a price on an item for sale', async () => {
    db.submission.findUnique.mockResolvedValue({ translations: {}, type: 'PRODUCT' });

    expect((await updateAdminListing(ID, { ...EDIT, price: '', priceMax: '60' })).success).toBe(false);
  });

  it('refuses a category the store does not have', async () => {
    expect((await updateAdminListing(ID, { ...EDIT, category: 'muebles' })).success).toBe(false);
    expect(db.submission.update).not.toHaveBeenCalled();
  });
});

describe('deleteAdminListing', () => {
  it('removes the product and the listing together', async () => {
    db.submission.findUnique.mockResolvedValue({ productId: 'product-1' });

    expect(await deleteAdminListing(ID)).toEqual({ success: true, message: 'Anuncio eliminado' });
    expect(db.product.delete).toHaveBeenCalledWith({ where: { id: 'product-1' } });
    expect(db.$transaction).toHaveBeenCalledWith(['delete-product', 'delete-submission']);
  });

  it('removes a listing that never had a product', async () => {
    db.submission.findUnique.mockResolvedValue({ productId: null });

    expect((await deleteAdminListing(ID)).success).toBe(true);
    expect(db.$transaction).toHaveBeenCalledWith(['delete-submission']);
  });

  it('says so when the listing is already gone', async () => {
    db.submission.findUnique.mockResolvedValue(null);

    expect(await deleteAdminListing(ID)).toEqual({ success: false, message: 'Este anuncio ya no existe' });
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it('gives a friendly message when the product cannot go, e.g. it is in an order', async () => {
    db.submission.findUnique.mockResolvedValue({ productId: 'product-1' });
    db.$transaction.mockRejectedValueOnce(new Error('Foreign key constraint failed'));
    const quiet = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(await deleteAdminListing(ID)).toEqual({ success: false, message: 'No se pudo eliminar este anuncio' });
    quiet.mockRestore();
  });

  it('refuses an id that is not a listing id', async () => {
    expect((await deleteAdminListing('not-an-id')).success).toBe(false);
    expect(db.submission.findUnique).not.toHaveBeenCalled();
  });
});

describe('setAdminListingCategory', () => {
  it('saves the slug of the chosen category', async () => {
    await setAdminListingCategory(ID, 'Bicis y motor');
    expect(db.submission.update).toHaveBeenCalledWith({ where: { id: ID }, data: { category: 'motor' } });
  });
});

describe('describeAdminListing', () => {
  beforeEach(() => db.submission.findUnique.mockResolvedValue({ type: 'PRODUCT', rawImages: ['https://utfs.io/f/bike.jpg'], images: [], lastError: null }));

  it('starts the text right away, while the AI still makes the pictures', async () => {
    db.submission.updateMany.mockResolvedValue({ count: 1 });

    expect((await describeAdminListing(ID, { notes: 'Bici, 80€', sellerPhone: '612345678' })).success).toBe(true);

    expect(db.submission.updateMany.mock.calls[0][0].where).toEqual({ id: ID, status: 'COLLECTING', createdByAdmin: true });
    expect(processSubmission).toHaveBeenCalledWith(ID);
    // The pictures' own run is still going: it isn't started twice.
    expect(makeListingPictures).not.toHaveBeenCalled();
  });

  it('starts the pictures again when they had failed before the description', async () => {
    db.submission.findUnique.mockResolvedValue({ type: 'PRODUCT', rawImages: ['https://utfs.io/f/bike.jpg'], images: [], lastError: 'overloaded' });
    db.submission.updateMany.mockResolvedValue({ count: 1 });

    expect((await describeAdminListing(ID, { notes: 'Bici, 80€', sellerPhone: '612345678' })).success).toBe(true);

    expect(db.submission.updateMany.mock.calls[0][0].data.lastError).toBeNull();
    expect(processSubmission).toHaveBeenCalledWith(ID);
    expect(makeListingPictures).toHaveBeenCalledWith(ID);
  });

  it('does not wait for pictures when a service has only a video: the AI makes the picture from the text', async () => {
    db.submission.findUnique.mockResolvedValue({ type: 'SERVICE', rawImages: ['https://x.ufs.sh/f/clip#video'] });
    db.submission.updateMany.mockResolvedValue({ count: 1 });

    expect((await describeAdminListing(ID, { notes: 'Ana, clases de surf', sellerPhone: '612345678' })).success).toBe(true);
    expect(db.submission.updateMany.mock.calls[0][0].where).toEqual({ id: ID, status: 'COLLECTING', createdByAdmin: true });
  });

  it('needs a description when there is no photo, because the AI makes the picture from it', async () => {
    db.submission.findUnique.mockResolvedValue({ type: 'PRODUCT', rawImages: [] });

    expect((await describeAdminListing(ID, { notes: '' })).success).toBe(false);
    expect(db.submission.updateMany).not.toHaveBeenCalled();
  });

  it('needs the person\'s WhatsApp: buyers write to them directly, not through the Corral', async () => {
    db.submission.findUnique.mockResolvedValue({ type: 'SERVICE', rawImages: ['https://utfs.io/f/garden.jpg'] });

    expect((await describeAdminListing(ID, { notes: 'Jardinero en Corralejo' })).success).toBe(false);
    expect(db.submission.updateMany).not.toHaveBeenCalled();
  });

  it('refuses a number without digits, and never falls back to the house seller', async () => {
    expect((await describeAdminListing(ID, { notes: 'Bici, 80€', sellerPhone: ' - ' })).success).toBe(false);
    expect(db.seller.upsert).not.toHaveBeenCalled();
    expect(db.submission.updateMany).not.toHaveBeenCalled();
  });

  it('gives the listing to the person whose WhatsApp was entered', async () => {
    db.submission.updateMany.mockResolvedValue({ count: 1 });

    expect((await describeAdminListing(ID, { notes: 'Bici, 80€', sellerPhone: '612 345 678' })).success).toBe(true);
    expect(db.seller.upsert.mock.calls[0][0].where).toEqual({ waId: '34612345678' });
  });

  it('reads a number written with 0034 like one with +34', async () => {
    db.submission.updateMany.mockResolvedValue({ count: 1 });

    await describeAdminListing(ID, { notes: 'Bici, 80€', sellerPhone: '0034 612 345 678' });
    await describeAdminListing(ID, { notes: 'Bici, 80€', sellerPhone: '+34 612 345 678' });

    expect(db.seller.upsert.mock.calls.map((call) => call[0].where)).toEqual([{ waId: '34612345678' }, { waId: '34612345678' }]);
  });

  it('saves the person\'s name, and keeps the one they have when none is given', async () => {
    db.submission.updateMany.mockResolvedValue({ count: 1 });

    await describeAdminListing(ID, { notes: 'Bici, 80€', sellerPhone: '612345678', sellerName: ' Lula ' });
    await describeAdminListing(ID, { notes: 'Bici, 80€', sellerPhone: '612345678', sellerName: '' });

    expect(db.seller.upsert.mock.calls[0][0]).toMatchObject({ update: { name: 'Lula' }, create: { waId: '34612345678', name: 'Lula' } });
    expect(db.seller.upsert.mock.calls[1][0].update).toEqual({ name: undefined });
  });

  it('refuses a name with a phone number in it', async () => {
    const result = await describeAdminListing(ID, { notes: 'Bici, 80€', sellerPhone: '612345678', sellerName: 'Lula 612345678' });

    expect(result).toEqual({ success: false, message: 'Revisa el nombre' });
    expect(db.seller.upsert).not.toHaveBeenCalled();
  });

  it('keeps the admin\'s title for "only fix mistakes", but not for the AI\'s text', async () => {
    db.submission.updateMany.mockResolvedValue({ count: 1 });

    await describeAdminListing(ID, { notes: 'bici comoda', textMode: 'corrected', originalTitle: 'Mi bici', sellerPhone: '612345678' });
    await describeAdminListing(ID, { notes: 'bici comoda', textMode: 'ai', originalTitle: 'Mi bici', sellerPhone: '612345678' });

    expect(db.submission.updateMany.mock.calls[0][0].data).toMatchObject({ textMode: 'corrected', originalTitle: 'Mi bici' });
    expect(db.submission.updateMany.mock.calls[1][0].data).toMatchObject({ textMode: 'ai', originalTitle: null });
  });

  it('starts the text only once, when the description was already sent', async () => {
    db.submission.updateMany.mockResolvedValue({ count: 0 });

    expect((await describeAdminListing(ID, { notes: 'Bici', sellerPhone: '612345678' })).success).toBe(false);
    expect(processSubmission).not.toHaveBeenCalled();
  });
});

describe('updateAdminListingPhotos', () => {
  const KEPT = 'https://x.ufs.sh/f/kept.jpg';
  const GONE = 'https://x.ufs.sh/f/gone.jpg';
  const ADDED = 'https://x.ufs.sh/f/added.jpg';
  const VIDEO = 'https://x.ufs.sh/f/clip#video=https%3A%2F%2Fx.ufs.sh%2Ff%2Fstill';

  beforeEach(() => {
    db.submission.findUnique.mockResolvedValue({ rawImages: [KEPT, GONE], aiImages: ['https://x.ufs.sh/f/kept-ai.jpg', 'https://x.ufs.sh/f/gone-ai.jpg'], picturePrompt: null });
    db.submission.updateMany.mockResolvedValue({ count: 1 });
  });

  it('keeps the AI pictures of the photos that stay, without the AI, when one is removed', async () => {
    expect((await updateAdminListingPhotos(ID, { photos: [KEPT, VIDEO], useAi: true })).success).toBe(true);

    expect(db.submission.updateMany.mock.calls[0][0]).toMatchObject({
      where: { id: ID, status: 'COLLECTING', createdByAdmin: true },
      data: { rawImages: [KEPT, VIDEO], aiImages: ['https://x.ufs.sh/f/kept-ai.jpg', ''], images: ['https://x.ufs.sh/f/kept-ai.jpg', VIDEO] },
    });
    expect(makeListingPictures).not.toHaveBeenCalled();
  });

  it('starts the pictures again when a photo without one is added', async () => {
    await updateAdminListingPhotos(ID, { photos: [KEPT, ADDED], useAi: true });

    expect(db.submission.updateMany.mock.calls[0][0].data).toMatchObject({ aiImages: ['https://x.ufs.sh/f/kept-ai.jpg', ''], images: [] });
    expect(makeListingPictures).toHaveBeenCalledWith(ID);
  });

  it('makes every picture again with new words for them', async () => {
    db.submission.findUnique.mockResolvedValue({ rawImages: [KEPT], aiImages: ['https://x.ufs.sh/f/kept-ai.jpg'], usesAi: true, picturePrompt: null });

    await updateAdminListingPhotos(ID, { photos: [KEPT], useAi: true, picturePrompt: ' on a wooden table ' });

    expect(db.submission.updateMany.mock.calls[0][0].data).toMatchObject({ aiImages: [''], images: [], picturePrompt: 'on a wooden table' });
    expect(makeListingPictures).toHaveBeenCalledWith(ID);
  });

  it('uses the photos as they are without AI', async () => {
    await updateAdminListingPhotos(ID, { photos: [ADDED, KEPT], useAi: false });

    expect(db.submission.updateMany.mock.calls[0][0].data).toMatchObject({ images: [ADDED, KEPT], usesAi: false });
    expect(makeListingPictures).not.toHaveBeenCalled();
  });

  it('refuses once the description was sent', async () => {
    db.submission.updateMany.mockResolvedValue({ count: 0 });

    expect((await updateAdminListingPhotos(ID, { photos: [ADDED], useAi: true })).success).toBe(false);
    expect(makeListingPictures).not.toHaveBeenCalled();
  });

  it('refuses photos from anywhere else', async () => {
    expect((await updateAdminListingPhotos(ID, { photos: ['https://evil.example/x.jpg'], useAi: true })).success).toBe(false);
    expect(db.submission.updateMany).not.toHaveBeenCalled();
  });

  describe('type tabs', () => {
    beforeEach(() => {
      db.submission.findUnique.mockResolvedValue({ rawImages: [KEPT], aiImages: [''], usesAi: true, picturePrompt: null });
    });

    it('saves only the type when the photos stay, so no second picture run starts', async () => {
      expect((await updateAdminListingPhotos(ID, { photos: [KEPT], useAi: true, type: 'SERVICE' })).success).toBe(true);

      expect(db.submission.updateMany.mock.calls[0][0]).toEqual({ where: { id: ID, status: 'COLLECTING', createdByAdmin: true }, data: { type: 'SERVICE' } });
      expect(makeListingPictures).not.toHaveBeenCalled();
    });

    it('uses the photos as they are for an event', async () => {
      await updateAdminListingPhotos(ID, { photos: [KEPT], useAi: false, type: 'EVENT' });

      expect(db.submission.updateMany.mock.calls[0][0].data).toMatchObject({ images: [KEPT], usesAi: false, type: 'EVENT' });
      expect(makeListingPictures).not.toHaveBeenCalled();
    });

    it('brings the AI pictures made before back when leaving the event', async () => {
      db.submission.findUnique.mockResolvedValue({ rawImages: [KEPT], aiImages: ['https://x.ufs.sh/f/kept-ai.jpg'], usesAi: false, picturePrompt: null });

      await updateAdminListingPhotos(ID, { photos: [KEPT], useAi: true, type: 'PRODUCT' });

      expect(db.submission.updateMany.mock.calls[0][0].data).toMatchObject({ images: ['https://x.ufs.sh/f/kept-ai.jpg'], usesAi: true, type: 'PRODUCT' });
      expect(makeListingPictures).not.toHaveBeenCalled();
    });

    it('refuses a type that does not exist', async () => {
      expect((await updateAdminListingPhotos(ID, { photos: [KEPT], useAi: true, type: 'JOB' as 'EVENT' })).success).toBe(false);
      expect(db.submission.updateMany).not.toHaveBeenCalled();
    });

    it('refuses while the AI writes the listing', async () => {
      db.submission.updateMany.mockResolvedValue({ count: 0 });

      expect((await updateAdminListingPhotos(ID, { photos: [KEPT], useAi: true, type: 'EVENT' })).success).toBe(false);
    });
  });
});

describe('createAdminListing', () => {
  it('starts a wanted ad without photos, and no pictures to make yet', async () => {
    const result = await createAdminListing({ photos: [], type: 'WANTED' });

    expect(result).toMatchObject({ success: true, id: 'new-1' });
    expect(db.submission.create.mock.calls[0][0].data).toMatchObject({ rawImages: [], type: 'WANTED' });
    expect(makeListingPictures).not.toHaveBeenCalled();
  });

  it('makes the pictures right away when there are photos', async () => {
    await createAdminListing({ photos: ['https://utfs.io/f/bike.jpg'], type: 'SERVICE' });

    expect(db.submission.create.mock.calls[0][0].data).toMatchObject({ type: 'SERVICE' });
    expect(makeListingPictures).toHaveBeenCalledWith('new-1');
  });

  it('uses photos and videos as they are without AI, in the admin\'s order (a first video\'s still is the cover)', async () => {
    const video = 'https://x.ufs.sh/f/clip#video=https%3A%2F%2Fx.ufs.sh%2Ff%2Fstill';
    await createAdminListing({ photos: [video, 'https://utfs.io/f/ana.jpg'], type: 'SERVICE', useAi: false });

    expect(db.submission.create.mock.calls[0][0].data).toMatchObject({ rawImages: [video, 'https://utfs.io/f/ana.jpg'], images: [video, 'https://utfs.io/f/ana.jpg'], usesAi: false });
    expect(makeListingPictures).not.toHaveBeenCalled();
  });

  it('refuses a type that does not exist', async () => {
    expect((await createAdminListing({ photos: [], type: 'service' as never })).success).toBe(false);
    expect(db.submission.create).not.toHaveBeenCalled();
  });

  it('needs something uploaded to go on without AI', async () => {
    expect((await createAdminListing({ photos: [], type: 'SERVICE', useAi: false })).success).toBe(false);
    expect(db.submission.create).not.toHaveBeenCalled();
  });
});

describe('createAdminListingPicture', () => {
  it('makes a picture from the listing text when the admin typed nothing', async () => {
    db.submission.findUnique.mockResolvedValue({ title: 'Busco tabla', description: 'Una tabla de 7 pies.', type: 'WANTED', rawImages: [] });

    expect(await createAdminListingPicture(ID)).toEqual({ success: true, message: '', url: 'https://x.ufs.sh/f/made.jpg' });
    expect(createPicture).toHaveBeenCalledWith({ title: 'Busco tabla', description: 'Una tabla de 7 pies.' }, 'WANTED');
  });

  it('uses what the admin typed instead', async () => {
    db.submission.findUnique.mockResolvedValue({ title: 'Clases de surf', description: '', type: 'SERVICE', rawImages: [] });

    await createAdminListingPicture(ID, 'surf lesson at sunrise');
    expect(createPicture).toHaveBeenCalledWith({ title: 'surf lesson at sunrise', description: '' }, 'SERVICE');
  });

  it("uses the editor's description even before it is saved", async () => {
    db.submission.findUnique.mockResolvedValue({ title: 'Concierto', description: '', type: 'EVENT', rawImages: [] });

    await createAdminListingPicture(ID, undefined, { title: 'Concierto', description: 'Jazz en la playa.' });
    expect(createPicture).toHaveBeenCalledWith({ title: 'Concierto', description: 'Jazz en la playa.' }, 'EVENT');
  });

  it('makes it from the uploaded photo when there is no description', async () => {
    db.submission.findUnique.mockResolvedValue({ title: 'Concierto', description: '', type: 'EVENT', rawImages: ['https://utfs.io/f/poster.jpg'] });

    expect((await createAdminListingPicture(ID)).success).toBe(true);
    expect(createPicture).not.toHaveBeenCalled();
    expect(enhancePhoto).toHaveBeenCalledWith(expect.any(Buffer), 'EVENT');
  });

  it('makes no picture without a description and without a photo: the AI never invents one', async () => {
    db.submission.findUnique.mockResolvedValue({ title: 'Concierto', description: ' ', type: 'EVENT', rawImages: [] });

    expect(await createAdminListingPicture(ID)).toEqual({ success: false, message: 'Escribe primero una descripción o sube una foto' });
    expect(createPicture).not.toHaveBeenCalled();
    expect(enhancePhoto).not.toHaveBeenCalled();
  });
});

describe('addAdminVideoStill', () => {
  const ORIGINAL = 'https://x.ufs.sh/f/clip#video';
  const CLEANED = 'https://x.ufs.sh/f/clean#video';
  const STILL = `#video=${encodeURIComponent('https://x.ufs.sh/f/made.jpg')}`;

  it('gives the video and its cleaned-up version the same still', async () => {
    db.submission.findUnique.mockResolvedValue({ rawImages: ['https://utfs.io/f/bike.jpg', ORIGINAL], aiImages: ['', CLEANED], images: ['https://utfs.io/f/bike.jpg', CLEANED] });

    expect(await addAdminVideoStill(ID, CLEANED)).toEqual({ success: true, message: '', url: `https://x.ufs.sh/f/clean${STILL}` });
    expect(db.submission.update.mock.calls[0][0].data).toEqual({
      rawImages: ['https://utfs.io/f/bike.jpg', `https://x.ufs.sh/f/clip${STILL}`],
      aiImages: ['', `https://x.ufs.sh/f/clean${STILL}`],
      images: ['https://utfs.io/f/bike.jpg', `https://x.ufs.sh/f/clean${STILL}`],
    });
  });

  it('marks a video named .mp4 and leaves the stored ones alone when it is new in the editor', async () => {
    const stored = { rawImages: [ORIGINAL], aiImages: [''], images: [ORIGINAL] };
    db.submission.findUnique.mockResolvedValue(stored);

    expect(await addAdminVideoStill(ID, 'https://x.ufs.sh/f/new.mp4')).toMatchObject({ url: `https://x.ufs.sh/f/new.mp4${STILL}` });
    expect(db.submission.update.mock.calls[0][0].data).toEqual(stored);
  });

  it('says so when the listing is gone', async () => {
    db.submission.findUnique.mockResolvedValue(null);

    expect(await addAdminVideoStill(ID, ORIGINAL)).toEqual({ success: false, message: 'Este anuncio ya no existe' });
    expect(takeVideoStill).not.toHaveBeenCalled();
  });

  it('takes no photo and no file from elsewhere', async () => {
    expect((await addAdminVideoStill(ID, 'https://utfs.io/f/bike.jpg')).success).toBe(false);
    expect((await addAdminVideoStill(ID, 'https://evil.example/clip.mp4')).success).toBe(false);
    expect(takeVideoStill).not.toHaveBeenCalled();
  });

  it('answers kindly when the frame cannot be taken', async () => {
    db.submission.findUnique.mockResolvedValue({ rawImages: [ORIGINAL], aiImages: [''], images: [ORIGINAL] });
    (takeVideoStill as jest.Mock).mockRejectedValueOnce(new Error('ffmpeg exited with 1'));
    jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(await addAdminVideoStill(ID, ORIGINAL)).toEqual({ success: false, message: 'No se pudo sacar una imagen del vídeo. Inténtalo otra vez.' });
    expect(db.submission.update).not.toHaveBeenCalled();
  });
});

describe('publishAdminListing', () => {
  it('puts an event online only with its date', async () => {
    db.submission.findUnique.mockResolvedValue({ type: 'EVENT', startsAt: null });

    expect((await publishAdminListing(ID, 'normal')).success).toBe(false);
    expect(publishByAdmin).not.toHaveBeenCalled();
  });

  it('puts the person\'s number online only with their recorded OK', async () => {
    db.submission.findUnique.mockResolvedValue({ type: 'PRODUCT', startsAt: null, consentAt: null, seller: { waId: '34600111222' } });

    expect((await publishAdminListing(ID, 'normal')).success).toBe(false);
    expect(publishByAdmin).not.toHaveBeenCalled();
  });
});

describe('retryAdminListing', () => {
  it('only redoes the pictures while the listing is still on the photos step', async () => {
    db.submission.findUnique.mockResolvedValue({ status: 'COLLECTING' });

    await retryAdminListing(ID);

    expect(makeListingPictures).toHaveBeenCalledWith(ID);
    expect(processSubmission).not.toHaveBeenCalled();
  });

  it('redoes text and the upload\'s pictures when both are still missing after the description', async () => {
    db.submission.findUnique.mockResolvedValue({ status: 'PROCESSING', createdByAdmin: true, usesAi: true, images: [], rawImages: ['https://utfs.io/f/bike.jpg'] });

    await retryAdminListing(ID);

    expect(processSubmission).toHaveBeenCalledWith(ID);
    expect(makeListingPictures).toHaveBeenCalledWith(ID);
  });

  it('leaves the pictures alone once they are there, or for a WhatsApp listing, whose run makes them itself', async () => {
    db.submission.findUnique.mockResolvedValueOnce({ status: 'PROCESSING', createdByAdmin: true, usesAi: true, images: ['https://x.ufs.sh/f/made.jpg'], rawImages: ['https://utfs.io/f/bike.jpg'] });
    await retryAdminListing(ID);
    db.submission.findUnique.mockResolvedValueOnce({ status: 'PROCESSING', createdByAdmin: false, usesAi: true, images: [], rawImages: ['https://utfs.io/f/bike.jpg'] });
    await retryAdminListing(ID);

    expect(processSubmission).toHaveBeenCalledTimes(2);
    expect(makeListingPictures).not.toHaveBeenCalled();
  });
});

describe('text versions', () => {
  const OWN = { es: { title: 'Mi bici', description: 'bici comoda' }, en: { title: 'My bike', description: 'comfy bike' } };

  it('saves an edit into the version in use, so switching back brings it again', async () => {
    db.submission.findUnique.mockResolvedValue({ translations: {}, textMode: 'ai', textVersions: { original: OWN } });

    await updateAdminListing(ID, { ...EDIT, textMode: 'ai' });

    expect(db.submission.update.mock.calls[0][0].data.textVersions).toEqual({
      original: OWN,
      ai: { es: { title: 'Bici de paseo', description: 'Bici cómoda.', short: '' }, en: { title: 'City bike', description: 'Comfy bike.' } },
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

  it('brings back the corrected version made before without asking the AI again', async () => {
    db.submission.findUnique.mockResolvedValue({ textVersions: { corrected: OWN }, rawText: 'bici comoda' });

    expect(await chooseListingText(ID, 'corrected')).toMatchObject({ success: true, texts: OWN });
    expect(correctText).not.toHaveBeenCalled();
    expect(translateText).not.toHaveBeenCalled();
  });

  it('translates the admin\'s own words the first time the original is chosen', async () => {
    db.submission.findUnique.mockResolvedValue({ textVersions: {}, rawText: 'bici comoda', originalTitle: 'Mi bici', title: 'Bici de paseo' });
    (translateText as jest.Mock).mockResolvedValue({ en: OWN.en });

    expect(await chooseListingText(ID, 'original')).toMatchObject({ texts: OWN });
    // Without a short title yet, the AI makes one from the title.
    expect(translateText).toHaveBeenCalledWith({ ...OWN.es, short: '' }, 'es', ['en']);
  });

  it('corrects and translates the admin\'s own words the first time "only fix mistakes" is chosen', async () => {
    db.submission.findUnique.mockResolvedValue({ textVersions: {}, rawText: 'bici comoda', originalTitle: 'Mi bici', title: 'Bici de paseo' });
    const corrected = { es: { title: 'Mi bici', description: 'Bici cómoda' }, en: OWN.en };
    (correctText as jest.Mock).mockResolvedValue(corrected);

    expect(await chooseListingText(ID, 'corrected')).toMatchObject({ texts: corrected });
    expect(correctText).toHaveBeenCalledWith({ ...OWN.es, short: '' }, 'es', ['en']);
    expect(writeListing).not.toHaveBeenCalled();
    expect(db.submission.update.mock.calls[0][0].data).toMatchObject({ textMode: 'corrected', textVersions: { corrected } });
  });

  it('refuses "my text as is" and "only fix mistakes" without a text', async () => {
    expect((await describeAdminListing(ID, { notes: '  ', textMode: 'original', sellerPhone: '612345678' })).success).toBe(false);
    expect((await describeAdminListing(ID, { notes: '  ', textMode: 'corrected', sellerPhone: '612345678' })).success).toBe(false);
    expect(db.submission.updateMany).not.toHaveBeenCalled();
  });
});

describe('ending a live listing', () => {
  it('cancels an event instead of marking it sold', async () => {
    db.submission.findUnique.mockResolvedValue({ type: 'EVENT', status: 'LIVE' });

    expect(await markAdminListingSold(ID)).toEqual({ success: true, message: 'Evento cancelado' });
    expect(takeDown).toHaveBeenCalledWith(ID, 'CANCELLED');
  });

  it('marks anything else sold', async () => {
    db.submission.findUnique.mockResolvedValue({ type: 'PRODUCT', status: 'LIVE' });

    await markAdminListingSold(ID);
    expect(takeDown).toHaveBeenCalledWith(ID, 'SOLD');
  });

  it('does not end a listing that is no longer live', async () => {
    db.submission.findUnique.mockResolvedValue({ type: 'PRODUCT', status: 'SOLD' });

    expect(await markAdminListingSold(ID)).toEqual({ success: false, message: 'Este anuncio ya no está online' });
    expect(takeDown).not.toHaveBeenCalled();
  });

  it('hides only a live listing', async () => {
    db.submission.findUnique.mockResolvedValue({ status: 'LIVE' });
    expect((await hideAdminListing(ID)).success).toBe(true);
    expect(takeDown).toHaveBeenCalledWith(ID, 'HIDDEN');

    jest.mocked(takeDown).mockClear();
    db.submission.findUnique.mockResolvedValue({ status: 'SOLD' });
    expect((await hideAdminListing(ID)).success).toBe(false);
    expect(takeDown).not.toHaveBeenCalled();
  });
});
