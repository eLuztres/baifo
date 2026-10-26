import { prisma } from '@/db/prisma';
import { createPicture, enhancePhoto, writeListing } from '@/lib/marketplace/ai';
import { fetchImage } from '@/lib/marketplace/media';
import { processSubmission } from '@/lib/marketplace/processing';
import { getShopPlaces } from '@/lib/places';

jest.mock('@/lib/i18n-server', () => ({ getShopLocale: () => 'es', getEnabledLocales: () => ['es', 'en'] }));
jest.mock('@/lib/whatsapp-cloud/client', () => ({ sendText: jest.fn() }));
jest.mock('@/lib/marketplace/review', () => ({ sendForReview: jest.fn() }));
jest.mock('@/lib/marketplace/catalog', () => ({ getListingCategories: jest.fn(async () => [{ slug: 'busco-surf' }]) }));
jest.mock('@/lib/marketplace/ai', () => ({
  writeListing: jest.fn(async () => ({
    texts: { es: { title: 'Busco tabla de surf', description: 'Una tabla de 7 pies.' } },
    category: 'busco-surf',
    condition: 'good',
    price: 150,
    place: 'el-cotillo',
  })),
  createPicture: jest.fn(async () => Buffer.from('picture')),
  enhancePhoto: jest.fn(),
}));
jest.mock('@/lib/marketplace/media', () => ({
  fetchImage: jest.fn(),
  storeWhatsappPhoto: jest.fn(),
  uploadImage: jest.fn(async () => 'https://x.ufs.sh/f/made.jpg'),
}));
jest.mock('@/db/prisma', () => ({ prisma: { submission: { findUnique: jest.fn(), update: jest.fn() } } }));
jest.mock('@/lib/places', () => ({
  getShopPlaces: jest.fn(async () => [
    { id: 'place-corralejo', slug: 'corralejo', name: 'Corralejo', x: 90, y: 7, isLive: true },
    { id: 'place-cotillo', slug: 'el-cotillo', name: 'El Cotillo', x: 70, y: 13, isLive: true },
    { id: 'place-morro', slug: 'morro-jable', name: 'Morro Jable', x: 24, y: 97, isLive: false },
  ]),
}));

const db = (prisma as unknown as { submission: Record<'findUnique' | 'update', jest.Mock> }).submission;

const WANTED = {
  id: 'sub-1',
  status: 'PROCESSING',
  mediaIds: [],
  rawImages: [],
  images: [],
  rawText: 'Busco una tabla de surf de 7 pies, hasta 150€',
  title: null,
  kind: 'product',
  isWanted: true,
  textMode: 'ai',
  createdByAdmin: true,
  price: null,
  placeId: null,
};

beforeEach(() => jest.clearAllMocks());

describe('processSubmission without a photo', () => {
  it('writes the text from the words alone, then makes the picture from that text', async () => {
    const written = { ...WANTED, title: 'Busco tabla de surf', description: 'Una tabla de 7 pies.' };
    db.findUnique.mockResolvedValueOnce(WANTED).mockResolvedValue(written);
    db.update.mockResolvedValue({ ...written, seller: {} });

    await processSubmission('sub-1');

    expect(fetchImage).not.toHaveBeenCalled();
    expect((writeListing as jest.Mock).mock.calls[0][0]).toBeNull();
    expect((writeListing as jest.Mock).mock.calls[0][6]).toBe(true);
    expect(createPicture).toHaveBeenCalledWith({ title: 'Busco tabla de surf', description: 'Una tabla de 7 pies.' }, 'product', true);
    expect(enhancePhoto).not.toHaveBeenCalled();
    expect(db.update).toHaveBeenCalledWith({ where: { id: 'sub-1' }, data: { images: ['https://x.ufs.sh/f/made.jpg'], lastError: null } });
  });

  it('gives the listing the town the AI read, asking only among the live places', async () => {
    db.findUnique.mockResolvedValueOnce(WANTED).mockResolvedValue({ ...WANTED, title: 'Busco tabla', description: '' });
    db.update.mockResolvedValue({ ...WANTED, seller: {} });

    await processSubmission('sub-1');

    expect((writeListing as jest.Mock).mock.calls[0][7].map((place: { slug: string }) => place.slug)).toEqual(['corralejo', 'el-cotillo']);
    expect(db.update.mock.calls[0][0].data.placeId).toBe('place-cotillo');
  });

  it('keeps a place the admin already set', async () => {
    db.findUnique.mockResolvedValueOnce({ ...WANTED, placeId: 'place-corralejo' }).mockResolvedValue({ ...WANTED, title: 'Busco tabla', description: '' });
    db.update.mockResolvedValue({ ...WANTED, seller: {} });

    await processSubmission('sub-1');

    expect(db.update.mock.calls[0][0].data.placeId).toBe('place-corralejo');
  });

  it('falls back to the first live place when the AI names none', async () => {
    (getShopPlaces as jest.Mock).mockResolvedValueOnce([{ id: 'place-corralejo', slug: 'corralejo', name: 'Corralejo', x: 90, y: 7, isLive: true }]);
    db.findUnique.mockResolvedValueOnce(WANTED).mockResolvedValue({ ...WANTED, title: 'Busco tabla', description: '' });
    db.update.mockResolvedValue({ ...WANTED, seller: {} });

    await processSubmission('sub-1');

    expect(db.update.mock.calls[0][0].data.placeId).toBe('place-corralejo');
  });

  it('still refuses a WhatsApp submission without a photo', async () => {
    db.findUnique.mockResolvedValue({ ...WANTED, createdByAdmin: false });
    db.update.mockResolvedValue({ attempts: 1 });

    await processSubmission('sub-1');

    expect(writeListing).not.toHaveBeenCalled();
    expect(db.update.mock.calls[0][0].data.lastError).toBe('No photo to work with');
  });
});
