import { prisma } from '@/db/prisma';
import {
  chooseListingText,
  createAdminListing,
  createAdminListingPicture,
  describeAdminListing,
  publishAdminListing,
  retryAdminListing,
  setAdminListingCategory,
  updateAdminListing,
} from '@/lib/marketplace/admin.actions';
import { correctText, createPicture, translateText, writeListing } from '@/lib/marketplace/ai';
import { makeListingPictures, processSubmission } from '@/lib/marketplace/processing';
import { publishByAdmin } from '@/lib/marketplace/publish';

jest.mock('@/lib/auth-guard', () => ({ isAdmin: jest.fn(async () => true) }));
jest.mock('@/lib/i18n-server', () => ({ getShopLocale: () => 'es', getEnabledLocales: () => ['es', 'en'] }));
jest.mock('@/lib/marketplace/ai', () => ({ correctText: jest.fn(), translateText: jest.fn(), writeListing: jest.fn(), createPicture: jest.fn(async () => Buffer.from('')) }));
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
  seller: Record<'upsert', jest.Mock>;
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

  it('changes the person\'s number before it goes live and forgets the old number\'s consent', async () => {
    db.submission.findUnique.mockResolvedValue({ translations: {}, type: 'PRODUCT', status: 'AWAITING_PAYMENT', seller: { waId: '34600111222' } });

    expect((await updateAdminListing(ID, { ...EDIT, sellerPhone: '611 222 333' })).success).toBe(true);
    expect(db.seller.upsert.mock.calls[0][0].where).toEqual({ waId: '34611222333' });
    expect(db.submission.update.mock.calls[0][0].data).toMatchObject({ sellerId: 'seller-1', hasContactConsent: false, consentAt: null, consentSource: null });
  });

  it('keeps the seller and the consent when the number stays the same', async () => {
    db.submission.findUnique.mockResolvedValue({ translations: {}, type: 'PRODUCT', status: 'IN_REVIEW', seller: { waId: '34600111222' } });

    expect((await updateAdminListing(ID, { ...EDIT, sellerPhone: '600111222' })).success).toBe(true);
    expect(db.seller.upsert).not.toHaveBeenCalled();
    expect(db.submission.update.mock.calls[0][0].data).not.toHaveProperty('consentAt');
  });

  it('does not change the number of a live listing, nor take a broken one', async () => {
    db.submission.findUnique.mockResolvedValue({ translations: {}, type: 'PRODUCT', status: 'LIVE', seller: { waId: '34600111222' } });

    expect((await updateAdminListing(ID, { ...EDIT, sellerPhone: '611222333' })).success).toBe(false);
    expect((await updateAdminListing(ID, { ...EDIT, sellerPhone: '12' })).message).toBe('Revisa el teléfono');
    expect(db.submission.update).not.toHaveBeenCalled();
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

  it('takes a kind of offer away from anything that is not a service', async () => {
    db.submission.findUnique.mockResolvedValue({ translations: {}, type: 'PRODUCT' });

    expect((await updateAdminListing(ID, { ...EDIT, serviceType: 'class' })).success).toBe(true);
    expect(db.submission.update.mock.calls[0][0].data).toMatchObject({ serviceType: null, priceMax: null });
  });

  it('keeps a budget range only on a wanted ad', async () => {
    db.submission.findUnique.mockResolvedValue({ translations: {}, type: 'WANTED' });

    expect((await updateAdminListing(ID, { ...EDIT, price: '50', priceMax: '90', condition: 'any' })).success).toBe(true);
    expect(db.submission.update.mock.calls[0][0].data).toMatchObject({ price: '50.00', priceMax: '90.00', condition: 'any' });
  });

  it('saves the seller\'s name and language, and empty as none', async () => {
    expect((await updateAdminListing(ID, { ...EDIT, sellerName: ' Lula ', sellerLocale: 'de' })).success).toBe(true);
    expect(db.submission.update.mock.calls[0][0].data).toMatchObject({ sellerName: 'Lula', sellerLocale: 'de' });

    expect((await updateAdminListing(ID, { ...EDIT, sellerName: '', sellerLocale: '' })).success).toBe(true);
    expect(db.submission.update.mock.calls[1][0].data).toMatchObject({ sellerName: null, sellerLocale: null });
  });

  it('refuses a seller name with a phone number, with its own message', async () => {
    const result = await updateAdminListing(ID, { ...EDIT, sellerName: 'Lula 612 345 678' });

    expect(result).toEqual({ success: false, message: 'El nombre del vendedor: sin enlaces ni teléfonos, máximo 30 letras' });
    expect(db.submission.update).not.toHaveBeenCalled();
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
    db.submission.findUnique.mockResolvedValue({ title: 'Busco tabla', description: 'Una tabla de 7 pies.', type: 'WANTED' });

    expect(await createAdminListingPicture(ID)).toEqual({ success: true, message: '', url: 'https://x.ufs.sh/f/made.jpg' });
    expect(createPicture).toHaveBeenCalledWith({ title: 'Busco tabla', description: 'Una tabla de 7 pies.' }, 'WANTED');
  });

  it('uses what the admin typed instead', async () => {
    db.submission.findUnique.mockResolvedValue({ title: 'Clases de surf', description: '', type: 'SERVICE' });

    await createAdminListingPicture(ID, 'surf lesson at sunrise');
    expect(createPicture).toHaveBeenCalledWith({ title: 'surf lesson at sunrise', description: '' }, 'SERVICE');
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
