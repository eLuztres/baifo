import { prisma } from '@/db/prisma';
import {
  addAdminVideoStill,
  chooseListingText,
  createAdminListingPicture,
  deleteAdminListing,
  describeAdminListing,
  draftAdminListingText,
  extendAdminListing,
  hideAdminListing,
  markAdminListingSold,
  publishAdminListing,
  retryAdminListing,
  saveAdminListingPictures,
  setAdminListingCategory,
  startAdminListing,
  updateAdminListing,
} from '@/lib/marketplace/admin.actions';
import { correctText, createPicture, enhancePhoto, translateText, writeListing } from '@/lib/marketplace/ai';
import { makeListingPictures, processSubmission, writeDraftText } from '@/lib/marketplace/processing';
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
  getDefaultPlaceId: jest.fn(async () => 'place-1'),
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
jest.mock('@/lib/marketplace/processing', () => ({ processSubmission: jest.fn(), makeListingPictures: jest.fn(), writeDraftText: jest.fn() }));
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
    hashtag: { upsert: jest.fn(async ({ where }: { where: { slug: string } }) => ({ id: `tag-${where.slug}` })), findMany: jest.fn(async () => [{ name: 'surf' }]) },
    $transaction: jest.fn(async (writes: unknown[]) => writes),
  },
}));

const db = prisma as unknown as {
  submission: Record<'findUnique' | 'findFirst' | 'update' | 'updateMany' | 'create' | 'delete', jest.Mock>;
  seller: Record<'upsert', jest.Mock>;
  product: Record<'update' | 'delete', jest.Mock>;
  hashtag: Record<'upsert', jest.Mock>;
  $transaction: jest.Mock;
};

const ID = 'ff25bd1e-d82d-4561-8ca2-337545aa373e';

const EDIT = {
  title: 'Bici de paseo',
  description: 'Bici cómoda.',
  translations: { en: { title: 'City bike', description: 'Comfy bike.' } },
  categories: ['motor'],
  price: '80',
  images: ['https://utfs.io/f/bike.jpg'],
};

beforeEach(() => {
  jest.clearAllMocks();
  db.submission.findUnique.mockResolvedValue({ translations: { it: { title: 'Bici da città', description: 'Bici comoda.' } } });
  db.submission.update.mockResolvedValue({ productId: 'product-1' });
});

describe('updateAdminListing', () => {
  it('sets the hashtags as the admin left them: each once, made when new', async () => {
    db.submission.update.mockResolvedValue({ productId: null, type: 'PRODUCT' });
    expect((await updateAdminListing(ID, { ...EDIT, hashtags: ['#Música', 'musica', 'surf'] })).success).toBe(true);
    expect(db.hashtag.upsert).toHaveBeenCalledTimes(2);
    expect(db.hashtag.upsert).toHaveBeenCalledWith({ where: { slug: 'musica' }, update: {}, create: { slug: 'musica', name: 'música' }, select: { id: true } });
    expect(db.submission.update).toHaveBeenCalledWith({ where: { id: ID }, data: { hashtags: { set: [{ id: 'tag-musica' }, { id: 'tag-surf' }] } } });
    // The strings never reach the listing's own fields.
    expect(db.submission.update.mock.calls.at(-1)?.[0].data).not.toHaveProperty('hashtags');
  });

  it('refuses more hashtags than a listing can have, and makes none', async () => {
    const result = await updateAdminListing(ID, { ...EDIT, hashtags: ['a', 'b', 'c', 'd', 'e', 'f'] });
    expect(result).toEqual({ success: false, message: 'Como mucho 5 hashtags' });
    expect(db.hashtag.upsert).not.toHaveBeenCalled();
  });

  it('leaves the hashtags alone when they are not in the edit, and removes them on an empty list', async () => {
    db.submission.update.mockResolvedValue({ productId: null, type: 'PRODUCT' });
    await updateAdminListing(ID, EDIT);
    expect(db.submission.update.mock.calls.some(([call]) => 'hashtags' in call.data)).toBe(false);
    await updateAdminListing(ID, { ...EDIT, hashtags: [] });
    expect(db.submission.update).toHaveBeenCalledWith({ where: { id: ID }, data: { hashtags: { set: [] } } });
  });

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

  it('keeps the seller\'s number, language and photos as they are, and the name when none is sent', async () => {
    db.submission.findUnique.mockResolvedValue({ translations: {}, type: 'PRODUCT', status: 'IN_REVIEW', seller: { waId: '34600111222' } });
    // An older editor still sending them changes nothing either; the same number changes nothing too.
    const oldEdit = { ...EDIT, sellerPhone: '600 111 222', sellerLocale: 'de' } as typeof EDIT;

    expect((await updateAdminListing(ID, oldEdit)).success).toBe(true);
    expect(db.seller.upsert).not.toHaveBeenCalled();
    const { data } = db.submission.update.mock.calls[0][0];
    for (const kept of ['sellerId', 'sellerName', 'sellerLocale', 'hasContactConsent', 'consentAt', 'rawImages']) expect(data).not.toHaveProperty(kept);
    expect(data.images).toEqual(EDIT.images);
  });

  it('saves a changed name on this listing only; emptied stays empty', async () => {
    db.submission.findUnique.mockResolvedValue({ translations: {}, type: 'PRODUCT', status: 'LIVE', seller: { waId: '34600111222', name: 'Ana' } });

    expect((await updateAdminListing(ID, { ...EDIT, sellerName: ' Lula ' })).success).toBe(true);
    expect(db.submission.update.mock.calls[0][0].data.sellerName).toBe('Lula');
    expect(db.seller.upsert).not.toHaveBeenCalled();

    expect((await updateAdminListing(ID, { ...EDIT, sellerName: '' })).success).toBe(true);
    expect(db.submission.update.mock.calls[1][0].data.sellerName).toBeNull();

    expect((await updateAdminListing(ID, { ...EDIT, sellerName: 'https://example.com' })).message).toBe('Revisa el nombre');
  });

  it('moves the listing and its product to a new number, checked like the seller\'s own change', async () => {
    db.$transaction.mockImplementationOnce(async (run: (tx: unknown) => unknown) => run(prisma));
    const live = { translations: {}, type: 'PRODUCT', productId: 'product-1', hasContactConsent: true, seller: { waId: '34600111222', name: 'Ana' } };
    db.submission.findUnique.mockResolvedValue(live);

    expect((await updateAdminListing(ID, { ...EDIT, sellerPhone: '0049 151 1234 5678' })).success).toBe(true);
    expect(db.seller.upsert.mock.calls[0][0]).toMatchObject({ where: { waId: '4915112345678' }, create: { waId: '4915112345678' } });
    expect(db.submission.update.mock.calls[0][0]).toEqual({ where: { id: ID }, data: { sellerId: 'seller-1' } });
    expect(db.product.update.mock.calls[0][0].data).toEqual({ sellerId: 'seller-1', contactPhone: '+4915112345678' });
  });

  it('refuses a broken number, and taking a person\'s number away; a house listing may stay without one', async () => {
    db.submission.findUnique.mockResolvedValue({ translations: {}, type: 'PRODUCT', seller: { waId: '34600111222', name: null } });
    expect((await updateAdminListing(ID, { ...EDIT, sellerPhone: '12' })).message).toBe('Revisa el teléfono');
    expect((await updateAdminListing(ID, { ...EDIT, sellerPhone: '' })).message).toBe('Escribe su WhatsApp u otra forma de contacto');
    expect(db.submission.update).not.toHaveBeenCalled();
    // WhatsApp is optional when the person can be reached another way.
    expect((await updateAdminListing(ID, { ...EDIT, sellerPhone: '', contacts: { email: 'ana@example.com', web: '', instagram: '' } })).success).toBe(true);
    jest.clearAllMocks();

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

  it('saves a listing without a price as no amount, and a service keeps its older kind of offer', async () => {
    db.submission.findUnique.mockResolvedValue({ translations: {}, type: 'SERVICE' });

    expect((await updateAdminListing(ID, { ...EDIT, price: '50', priceMode: 'NONE' })).success).toBe(true);
    expect(db.submission.update.mock.calls[0][0].data).toMatchObject({ price: null, priceMode: 'NONE' });
    expect(db.submission.update.mock.calls[0][0].data.serviceType).toBeUndefined();
    expect(db.product.update.mock.calls[0][0].data).toMatchObject({ price: 0, priceMode: 'NONE' });
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
    const FULL = { ...EDIT, priceMode: 'FIXED', startsAt: '2026-11-26T19:00', address: 'Plaza de Lajares' } as const;

    it('turns a live product into an event: the product follows, its entry is a set price', async () => {
      db.submission.findUnique.mockResolvedValue({ translations: {}, type: 'PRODUCT' });
      db.submission.update.mockResolvedValue({ productId: 'product-1', type: 'EVENT' });

      expect((await updateAdminListing(ID, { ...FULL, priceMode: 'UP_TO', type: 'EVENT' })).success).toBe(true);
      expect(db.submission.update.mock.calls[0][0].data).toMatchObject({ type: 'EVENT', serviceType: null, priceMode: 'FIXED', address: 'Plaza de Lajares' });
      expect(db.product.update.mock.calls[0][0].data).toMatchObject({ type: 'EVENT', startsAt: new Date('2026-11-26T19:00:00Z'), name: 'Bici de paseo' });
    });

    it('turns an event into a wanted ad: its date and address go, its budget reads "up to"', async () => {
      db.submission.findUnique.mockResolvedValue({ translations: {}, type: 'EVENT' });
      db.submission.update.mockResolvedValue({ productId: 'product-1', type: 'WANTED' });

      expect((await updateAdminListing(ID, { ...FULL, price: '120', priceMode: 'UP_TO', type: 'WANTED' })).success).toBe(true);
      expect(db.submission.update.mock.calls[0][0].data).toMatchObject({ type: 'WANTED', startsAt: null, address: null, price: '120.00', priceMode: 'UP_TO' });
      expect(db.product.update.mock.calls[0][0].data).toMatchObject({ type: 'WANTED', startsAt: null, priceMode: 'UP_TO' });
    });

    it('turns a service back into a product, and takes the kind of offer away', async () => {
      db.submission.findUnique.mockResolvedValue({ translations: {}, type: 'SERVICE' });

      expect((await updateAdminListing(ID, { ...FULL, type: 'PRODUCT' })).success).toBe(true);
      expect(db.submission.update.mock.calls[0][0].data).toMatchObject({ type: 'PRODUCT', price: '80.00', priceMode: 'FIXED', serviceType: null, startsAt: null });
    });

    it('checks the edit for the new type', async () => {
      db.submission.findUnique.mockResolvedValue({ translations: {}, type: 'PRODUCT' });

      // An event needs its date; a price that isn't "no price" needs its amount.
      expect((await updateAdminListing(ID, { ...EDIT, type: 'EVENT' })).success).toBe(false);
      expect((await updateAdminListing(ID, { ...EDIT, price: '', priceMode: 'FROM', type: 'SERVICE' })).success).toBe(false);
      expect((await updateAdminListing(ID, { ...EDIT, type: 'CAR' as 'PRODUCT' })).success).toBe(false);
      expect(db.submission.update).not.toHaveBeenCalled();
    });
  });

  it('saves the same pictures in the same order when the category changes back and forth (card 293)', async () => {
    const categories = (prisma as unknown as { category: Record<'findMany', jest.Mock> }).category.findMany;
    categories.mockResolvedValue([
      { id: 'cat-1', slug: 'motor', name: { es: 'Bicis y motor' }, keywords: [] },
      { id: 'cat-2', slug: 'deporte', name: { es: 'Deporte' }, keywords: [] },
    ]);
    const images = ['https://utfs.io/f/second.jpg', 'https://utfs.io/f/first-ai.jpg', 'https://utfs.io/f/clip.mp4'];

    for (const category of ['deporte', 'motor', 'deporte']) await updateAdminListing(ID, { ...EDIT, categories: [category], images });

    expect(db.submission.update.mock.calls.map(([call]) => call.data.images)).toEqual([images, images, images]);
    expect(db.submission.update.mock.calls.every(([call]) => !('aiImages' in call.data) && !('rawImages' in call.data))).toBe(true);
    expect(db.product.update.mock.calls.map(([call]) => call.data.images)).toEqual([images, images, images]);
  });

  it('needs an amount unless there is no price', async () => {
    db.submission.findUnique.mockResolvedValue({ translations: {}, type: 'PRODUCT' });

    expect(await updateAdminListing(ID, { ...EDIT, price: '' })).toEqual({ success: false, message: 'Escribe el precio o elige «Sin precio»' });
    expect((await updateAdminListing(ID, { ...EDIT, price: '', priceMode: 'NONE' })).success).toBe(true);
  });

  it('keeps every chosen category, the first in the shop\'s order gives the text', async () => {
    const categories = (prisma as unknown as { category: Record<'findMany', jest.Mock> }).category.findMany;
    categories.mockResolvedValue([
      { id: 'cat-1', slug: 'motor', name: { es: 'Bicis y motor' }, keywords: [] },
      { id: 'cat-2', slug: 'deporte', name: { es: 'Deporte' }, keywords: [] },
    ]);
    await updateAdminListing(ID, { ...EDIT, categories: ['deporte', 'motor'] });
    expect(db.product.update).toHaveBeenLastCalledWith(expect.objectContaining({
      data: expect.objectContaining({ category: 'Bicis y motor', categories: { set: [{ id: 'cat-1' }, { id: 'cat-2' }] } }),
    }));
  });

  it('refuses a category the store does not have', async () => {
    expect((await updateAdminListing(ID, { ...EDIT, categories: ['muebles'] })).success).toBe(false);
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
    expect(db.submission.update).toHaveBeenCalledWith({ where: { id: ID }, data: { categories: ['motor'] } });
  });
});

describe('describeAdminListing', () => {
  // What "Crear descripción" made, as the admin left it.
  const DRAFT = { es: { title: 'Bici de paseo', description: 'Bici cómoda.' }, en: { title: 'City bike', description: 'Comfy bike.' } };

  beforeEach(() => db.submission.findUnique.mockResolvedValue({ type: 'PRODUCT', title: 'Bici', rawImages: ['https://utfs.io/f/bike.jpg'], images: [], lastError: null }));

  it('starts the text right away, while the AI still makes the pictures', async () => {
    db.submission.updateMany.mockResolvedValue({ count: 1 });

    expect((await describeAdminListing(ID, { notes: 'Bici, 80€', hasConsent: true, texts: DRAFT, categories: ['motor'], sellerPhone: '612345678' })).success).toBe(true);

    expect(db.submission.updateMany.mock.calls[0][0].where).toEqual({ id: ID, status: 'COLLECTING', createdByAdmin: true });
    expect(processSubmission).toHaveBeenCalledWith(ID);
    // The pictures' own run is still going: it isn't started twice.
    expect(makeListingPictures).not.toHaveBeenCalled();
  });

  it('starts the pictures again when they had failed before the description', async () => {
    db.submission.findUnique.mockResolvedValue({ type: 'PRODUCT', title: 'Bici', rawImages: ['https://utfs.io/f/bike.jpg'], images: [], lastError: 'overloaded' });
    db.submission.updateMany.mockResolvedValue({ count: 1 });

    expect((await describeAdminListing(ID, { notes: 'Bici, 80€', hasConsent: true, texts: DRAFT, categories: ['motor'], sellerPhone: '612345678' })).success).toBe(true);

    expect(db.submission.updateMany.mock.calls[0][0].data.lastError).toBeNull();
    expect(processSubmission).toHaveBeenCalledWith(ID);
    expect(makeListingPictures).toHaveBeenCalledWith(ID);
  });

  it('needs a picture: a video without a still is none, a picture made from words is one', async () => {
    db.submission.updateMany.mockResolvedValue({ count: 1 });
    db.submission.findUnique.mockResolvedValue({ type: 'SERVICE', title: 'Bici', rawImages: ['https://x.ufs.sh/f/clip#video'], images: [] });
    expect(await describeAdminListing(ID, { notes: 'Ana, clases de surf', hasConsent: true, texts: DRAFT, categories: ['motor'], sellerPhone: '612345678' })).toEqual({ success: false, message: 'Sube o crea al menos una foto' });

    db.submission.findUnique.mockResolvedValue({ type: 'SERVICE', title: 'Bici', rawImages: [], images: ['https://x.ufs.sh/f/made.jpg'] });
    expect((await describeAdminListing(ID, { notes: 'Ana, clases de surf', hasConsent: true, texts: DRAFT, categories: ['motor'], sellerPhone: '612345678' })).success).toBe(true);
  });

  it('makes it a wanted ad with Busco and an offer with Ofrezco, and never changes an event', async () => {
    db.submission.updateMany.mockResolvedValue({ count: 1 });
    const send = (isWanted: boolean) => describeAdminListing(ID, { notes: 'Tabla', hasConsent: true, texts: DRAFT, categories: ['motor'], sellerPhone: '612345678', isWanted });
    const typeSent = () => db.submission.updateMany.mock.calls.at(-2)[0].data.type;

    await send(true);
    expect(typeSent()).toBe('WANTED');
    await send(false);
    expect(typeSent()).toBe('PRODUCT');
    db.submission.findUnique.mockResolvedValue({ type: 'EVENT', title: 'Bici', rawImages: ['https://utfs.io/f/poster.jpg'], images: [] });
    expect(await send(true)).toEqual({ success: false, message: 'Elige la fecha y la hora del evento' });
    await describeAdminListing(ID, { notes: 'Bachata', hasConsent: true, texts: DRAFT, categories: ['motor'], sellerPhone: '612345678', isWanted: true, startsAt: '2026-11-26T19:00', address: 'Plaza de Lajares' });
    expect(typeSent()).toBeUndefined();
    expect(db.submission.updateMany.mock.calls.at(-2)[0].data).toMatchObject({ startsAt: new Date('2026-11-26T19:00:00Z'), address: 'Plaza de Lajares' });
  });

  it('publishes only with a title and description in every language, as the admin left them, and with a category', async () => {
    db.submission.updateMany.mockResolvedValue({ count: 1 });
    const missingEnglish = { es: DRAFT.es };
    expect(await describeAdminListing(ID, { notes: '', hasConsent: true, texts: missingEnglish, categories: ['motor'], sellerPhone: '612345678' })).toEqual({
      success: false,
      message: 'Faltan el título y la descripción en algún idioma',
    });
    expect(await describeAdminListing(ID, { notes: '', hasConsent: true, texts: DRAFT, sellerPhone: '612345678' })).toEqual({ success: false, message: 'Elige una de las categorías' });

    // Their own texts, without "Cuéntamelo todo".
    await describeAdminListing(ID, { notes: '', hasConsent: true, texts: DRAFT, categories: ['motor'], sellerPhone: '612345678', priceMode: 'FROM', price: '20' });
    expect(db.submission.updateMany.mock.calls[0][0].data).toMatchObject({
      title: 'Bici de paseo',
      description: 'Bici cómoda.',
      translations: { en: { title: 'City bike', description: 'Comfy bike.' } },
      priceMode: 'FROM',
      price: '20.00',
      categories: ['motor'],
    });
    await describeAdminListing(ID, { notes: 'Bici', hasConsent: true, texts: DRAFT, categories: ['motor'], sellerPhone: '612345678', priceMode: 'FIXED', price: '' });
    expect(db.submission.updateMany.mock.calls.at(-2)[0].data).toMatchObject({ priceMode: 'NONE', price: null });
    expect(await describeAdminListing(ID, { notes: 'Bici', hasConsent: true, texts: DRAFT, sellerPhone: '612345678', categories: ['muebles'] })).toEqual({ success: false, message: 'Elige una de las categorías' });
  });

  it('goes online by itself unless Oculto, and keeps the last day chosen through its end', async () => {
    db.submission.updateMany.mockResolvedValue({ count: 1 });
    const send = (extra: object) => describeAdminListing(ID, { notes: 'Bici', hasConsent: true, texts: DRAFT, categories: ['motor'], sellerPhone: '612345678', ...extra });

    await send({ onlineUntil: '2099-12-24' });
    expect(db.submission.updateMany.mock.calls.at(-2)[0].data).toMatchObject({ autoPublish: true, expiresAt: new Date('2099-12-24T23:59:00Z') });
    await send({ isHidden: true });
    expect(db.submission.updateMany.mock.calls.at(-2)[0].data).toMatchObject({ autoPublish: false });
    expect(await send({ onlineUntil: '2020-01-01' })).toEqual({ success: false, message: 'Elige un día de hoy en adelante' });
  });

  it('needs the description and the person\'s OK to show their number, and records that OK', async () => {
    db.submission.updateMany.mockResolvedValue({ count: 1 });

    expect(await describeAdminListing(ID, { notes: 'Bici', sellerPhone: '612345678' })).toEqual({ success: false, message: 'Falta su permiso para mostrar su contacto' });
    expect(db.submission.updateMany).not.toHaveBeenCalled();

    expect((await describeAdminListing(ID, { notes: 'Bici', hasConsent: true, texts: DRAFT, categories: ['motor'], sellerPhone: '612345678' })).success).toBe(true);
    expect(db.submission.updateMany.mock.calls[1][0]).toMatchObject({ where: { id: ID, consentAt: null }, data: { hasContactConsent: true, consentSource: 'admin-confirmed' } });
  });

  it('needs the person\'s WhatsApp: buyers write to them directly, not through the Corral', async () => {
    db.submission.findUnique.mockResolvedValue({ type: 'SERVICE', title: 'Bici', rawImages: ['https://utfs.io/f/garden.jpg'] });

    expect((await describeAdminListing(ID, { notes: 'Jardinero en Corralejo' })).success).toBe(false);
    expect(db.submission.updateMany).not.toHaveBeenCalled();
  });

  it('refuses a number without digits, and never falls back to the house seller', async () => {
    expect((await describeAdminListing(ID, { notes: 'Bici, 80€', hasConsent: true, texts: DRAFT, categories: ['motor'], sellerPhone: ' - ' })).success).toBe(false);
    expect(db.seller.upsert).not.toHaveBeenCalled();
    expect(db.submission.updateMany).not.toHaveBeenCalled();
  });

  it('gives the listing to the person whose WhatsApp was entered', async () => {
    db.submission.updateMany.mockResolvedValue({ count: 1 });

    expect((await describeAdminListing(ID, { notes: 'Bici, 80€', hasConsent: true, texts: DRAFT, categories: ['motor'], sellerPhone: '612 345 678' })).success).toBe(true);
    expect(db.seller.upsert.mock.calls[0][0].where).toEqual({ waId: '34612345678' });
  });

  it('reads a number written with 0034 like one with +34', async () => {
    db.submission.updateMany.mockResolvedValue({ count: 1 });

    await describeAdminListing(ID, { notes: 'Bici, 80€', hasConsent: true, texts: DRAFT, categories: ['motor'], sellerPhone: '0034 612 345 678' });
    await describeAdminListing(ID, { notes: 'Bici, 80€', hasConsent: true, texts: DRAFT, categories: ['motor'], sellerPhone: '+34 612 345 678' });

    expect(db.seller.upsert.mock.calls.map((call) => call[0].where)).toEqual([{ waId: '34612345678' }, { waId: '34612345678' }]);
  });

  it('saves the name on this listing only, never on the person behind the number', async () => {
    db.submission.updateMany.mockResolvedValue({ count: 1 });

    await describeAdminListing(ID, { notes: 'Bici, 80€', hasConsent: true, texts: DRAFT, categories: ['motor'], sellerPhone: '612345678', sellerName: ' Lula ' });
    await describeAdminListing(ID, { notes: 'Bici, 80€', hasConsent: true, texts: DRAFT, categories: ['motor'], sellerPhone: '612345678', sellerName: '' });

    expect(db.seller.upsert.mock.calls[0][0]).toMatchObject({ update: {}, create: { waId: '34612345678' } });
    expect(db.seller.upsert.mock.calls[0][0].create).not.toHaveProperty('name');
    const names = db.submission.updateMany.mock.calls.map(([{ data }]) => data).filter((data) => 'sellerName' in data).map((data) => data.sellerName);
    expect(names).toEqual(['Lula', null]);
  });

  it('refuses a name with a phone number in it', async () => {
    const result = await describeAdminListing(ID, { notes: 'Bici, 80€', hasConsent: true, texts: DRAFT, categories: ['motor'], sellerPhone: '612345678', sellerName: 'Lula 612345678' });

    expect(result).toEqual({ success: false, message: 'Revisa el nombre' });
    expect(db.seller.upsert).not.toHaveBeenCalled();
  });

  it('keeps the admin\'s title for "only fix mistakes", but not for the AI\'s text', async () => {
    db.submission.updateMany.mockResolvedValue({ count: 1 });

    await describeAdminListing(ID, { notes: 'bici comoda', textMode: 'corrected', originalTitle: 'Mi bici', hasConsent: true, texts: DRAFT, categories: ['motor'], sellerPhone: '612345678' });
    await describeAdminListing(ID, { notes: 'bici comoda', textMode: 'ai', originalTitle: 'Mi bici', hasConsent: true, texts: DRAFT, categories: ['motor'], sellerPhone: '612345678' });

    const sent = db.submission.updateMany.mock.calls.map(([call]) => call.data).filter((data) => 'textMode' in data);
    expect(sent[0]).toMatchObject({ textMode: 'corrected', originalTitle: 'Mi bici' });
    expect(sent[1]).toMatchObject({ textMode: 'ai', originalTitle: null });
  });

  it('starts the text only once, when the description was already sent', async () => {
    db.submission.updateMany.mockResolvedValue({ count: 0 });

    expect((await describeAdminListing(ID, { notes: 'Bici', hasConsent: true, texts: DRAFT, categories: ['motor'], sellerPhone: '612345678' })).success).toBe(false);
    expect(processSubmission).not.toHaveBeenCalled();
  });
});

describe('draftAdminListingText', () => {
  it('writes the texts now in every language, keeps the admin\'s price, and leaves the AI the one not set', async () => {
    db.submission.findUnique.mockResolvedValue({ type: 'PRODUCT' });
    db.submission.updateMany.mockResolvedValue({ count: 1 });
    (writeDraftText as jest.Mock).mockResolvedValue({ categories: ['motor'], title: 'Bici', description: 'Bici cómoda.', shortTitle: 'Bici', translations: { en: { title: 'Bike', description: 'Comfy.' } }, type: 'PRODUCT', priceMode: 'FIXED', price: 80 });

    const result = await draftAdminListingText(ID, { notes: 'bici 80 euros', textMode: 'corrected', isWanted: false, priceMode: 'FIXED', price: '' });

    expect(result).toMatchObject({ success: true, texts: { es: { title: 'Bici', description: 'Bici cómoda.', short: 'Bici' }, en: { title: 'Bike' } }, priceMode: 'FIXED', price: '80' });
    expect(db.submission.updateMany.mock.calls[0][0]).toMatchObject({ where: { id: ID, status: { not: 'PROCESSING' } }, data: { textMode: 'corrected', type: 'PRODUCT', price: null, priceMode: null } });

    await draftAdminListingText(ID, { notes: 'busco bici', textMode: 'ai', isWanted: true, priceMode: 'UP_TO', price: '90' });
    expect(db.submission.updateMany.mock.calls[1][0].data).toMatchObject({ type: 'WANTED', price: '90.00', priceMode: 'UP_TO' });
  });

  it('writes from the tab the admin wrote in, with its title, and lets the AI pick only among the shop\'s hashtags', async () => {
    db.submission.findUnique.mockResolvedValue({ type: 'PRODUCT' });
    db.submission.updateMany.mockResolvedValue({ count: 1 });
    (writeDraftText as jest.Mock).mockResolvedValue({ categories: ['motor'], title: 'Bici', description: 'Bici.', translations: {}, type: 'PRODUCT', hashtag: 'surf' });

    const result = await draftAdminListingText(ID, { notes: 'comfy bike', title: 'bike', language: 'en', textMode: 'corrected' });

    expect(db.submission.updateMany.mock.calls[0][0].data).toMatchObject({ rawText: 'comfy bike', originalTitle: 'bike' });
    expect(writeDraftText).toHaveBeenCalledWith(ID, { base: 'en', hashtags: ['surf'] });
    expect(result).toMatchObject({ success: true, hashtag: 'surf' });
  });

  it('needs words to write from', async () => {
    expect((await draftAdminListingText(ID, { notes: ' ', textMode: 'ai' })).success).toBe(false);
    expect(writeDraftText).not.toHaveBeenCalled();
  });
});

describe('a new listing as a draft', () => {
  it('opens an empty draft right away, hidden from the listings while it is collected', async () => {
    expect(await startAdminListing('EVENT')).toEqual({ success: true, message: '', id: 'new-1' });
    expect(db.submission.create.mock.calls[0][0].data).toMatchObject({ status: 'COLLECTING', createdByAdmin: true, type: 'EVENT', usesAi: false, placeId: 'place-1' });
    expect((await startAdminListing('CAR')).success).toBe(false);
  });

  it('saves the picture tabs as they are, only uploaded pictures and never while the AI writes, a live product too', async () => {
    db.submission.updateMany.mockResolvedValue({ count: 1 });
    const tabs = { images: ['https://x.ufs.sh/f/ai.jpg', 'https://x.ufs.sh/f/made.jpg'], rawImages: ['https://utfs.io/f/raw.jpg'], aiImages: ['https://x.ufs.sh/f/ai.jpg'] };

    expect((await saveAdminListingPictures(ID, tabs)).success).toBe(true);
    expect(db.submission.updateMany.mock.calls[0][0]).toEqual({ where: { id: ID, status: { not: 'PROCESSING' } }, data: { ...tabs, lastError: null } });
    db.submission.findUnique.mockResolvedValueOnce({ productId: 'product-1' });
    await saveAdminListingPictures(ID, tabs);
    expect(db.product.update).toHaveBeenCalledWith({ where: { id: 'product-1' }, data: { images: tabs.images } });
    expect((await saveAdminListingPictures(ID, { ...tabs, images: ['https://evil.example/x.jpg'] })).success).toBe(false);
    expect((await saveAdminListingPictures(ID, { ...tabs, aiImages: [] })).success).toBe(false);
  });
});

describe('createAdminListingPicture', () => {
  it('makes it from what the admin typed', async () => {
    db.submission.findUnique.mockResolvedValue({ type: 'SERVICE', rawImages: [] });

    expect(await createAdminListingPicture(ID, 'surf lesson at sunrise')).toEqual({ success: true, message: '', url: 'https://x.ufs.sh/f/made.jpg' });
    expect(createPicture).toHaveBeenCalledWith({ title: 'surf lesson at sunrise', description: '' }, 'SERVICE');
  });

  it('improves the uploaded photo when the admin typed nothing', async () => {
    db.submission.findUnique.mockResolvedValue({ type: 'EVENT', rawImages: ['https://utfs.io/f/poster.jpg'] });

    expect((await createAdminListingPicture(ID)).success).toBe(true);
    expect(createPicture).not.toHaveBeenCalled();
    expect(enhancePhoto).toHaveBeenCalledWith(expect.any(Buffer), 'EVENT', undefined);
  });

  it("changes a picture tab's own photo with the words on top, and fetches only uploaded photos", async () => {
    db.submission.findUnique.mockResolvedValue({ type: 'PRODUCT', rawImages: [] });

    expect((await createAdminListingPicture(ID, 'sobre una mesa', 'https://utfs.io/f/raw.jpg')).success).toBe(true);
    expect(enhancePhoto).toHaveBeenCalledWith(expect.any(Buffer), 'PRODUCT', 'sobre una mesa');
    expect(createPicture).not.toHaveBeenCalled();
    expect(await createAdminListingPicture(ID, 'x', 'https://evil.example/x.jpg')).toEqual({ success: false, message: 'Revisa las fotos' });
  });

  it('makes no picture without an idea and without a photo, never from the description', async () => {
    db.submission.findUnique.mockResolvedValue({ type: 'EVENT', rawImages: [] });

    expect(await createAdminListingPicture(ID)).toEqual({ success: false, message: 'Escribe primero tu idea o sube una foto' });
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
