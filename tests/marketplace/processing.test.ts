import { prisma } from '@/db/prisma';
import { createPicture, enhancePhoto, writeListing } from '@/lib/marketplace/ai';
import { fetchImage, uploadImage } from '@/lib/marketplace/media';
import { makeListingPictures, processSubmission } from '@/lib/marketplace/processing';
import { cleanUpVideo } from '@/lib/marketplace/video-cleanup';
import { getShopPlaces } from '@/lib/places';

jest.mock('@/lib/i18n-server', () => ({ getShopLocale: () => 'es', getEnabledLocales: () => ['es', 'en'] }));
jest.mock('@/lib/whatsapp-cloud/client', () => ({ sendText: jest.fn() }));
jest.mock('@/lib/marketplace/review', () => ({ sendForReview: jest.fn() }));
jest.mock('@/lib/marketplace/catalog', () => ({ getListingCategories: jest.fn(async () => [{ slug: 'deporte' }]) }));
jest.mock('@/lib/marketplace/ai', () => ({
  writeListing: jest.fn(async () => ({
    texts: { es: { title: 'Busco tabla de surf', description: 'Una tabla de 7 pies.' } },
    category: 'deporte',
    type: 'WANTED',
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
jest.mock('@/lib/marketplace/video-cleanup', () => ({ cleanUpVideo: jest.fn(async () => Buffer.from('clean')) }));
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
  type: 'WANTED',
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
    expect((writeListing as jest.Mock).mock.calls[0][4]).toBe('WANTED');
    expect(createPicture).toHaveBeenCalledWith({ title: 'Busco tabla de surf', description: 'Una tabla de 7 pies.' }, 'WANTED');
    expect(enhancePhoto).not.toHaveBeenCalled();
    expect(db.update).toHaveBeenCalledWith({ where: { id: 'sub-1' }, data: { images: ['https://x.ufs.sh/f/made.jpg'], lastError: null } });
  });

  it('gives the listing the town the AI read, asking only among the live places', async () => {
    db.findUnique.mockResolvedValueOnce(WANTED).mockResolvedValue({ ...WANTED, title: 'Busco tabla', description: '' });
    db.update.mockResolvedValue({ ...WANTED, seller: {} });

    await processSubmission('sub-1');

    expect((writeListing as jest.Mock).mock.calls[0][6].map((place: { slug: string }) => place.slug)).toEqual(['corralejo', 'el-cotillo']);
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

  it('saves the type the AI read, so an item sent as for sale can turn out to be a wanted ad', async () => {
    db.findUnique.mockResolvedValueOnce({ ...WANTED, type: 'PRODUCT' }).mockResolvedValue({ ...WANTED, title: 'Busco tabla', description: '' });
    db.update.mockResolvedValue({ ...WANTED, seller: {} });

    await processSubmission('sub-1');

    expect((writeListing as jest.Mock).mock.calls[0][4]).toBe('PRODUCT');
    expect(db.update.mock.calls[0][0].data).toMatchObject({ type: 'WANTED', category: 'deporte', serviceType: null, startsAt: null });
  });

  it('still refuses a WhatsApp submission without a photo', async () => {
    db.findUnique.mockResolvedValue({ ...WANTED, createdByAdmin: false });
    db.update.mockResolvedValue({ attempts: 1 });

    await processSubmission('sub-1');

    expect(writeListing).not.toHaveBeenCalled();
    expect(db.update.mock.calls[0][0].data.lastError).toBe('No photo to work with');
  });
});

describe('processSubmission with a service video', () => {
  const VIDEO = 'https://x.ufs.sh/f/clip#video';
  const PHOTO = 'https://x.ufs.sh/f/photo';
  const SERVICE = { ...WANTED, type: 'SERVICE' };

  it('makes the cover from the text when there is only a video, and keeps the video after it', async () => {
    const written = { ...SERVICE, rawImages: [VIDEO], title: 'Clases de surf', description: 'Con Ana.' };
    db.findUnique.mockResolvedValueOnce({ ...SERVICE, rawImages: [VIDEO] }).mockResolvedValue(written);
    db.update.mockResolvedValue({ ...written, seller: {} });

    await processSubmission('sub-1');

    expect(fetchImage).not.toHaveBeenCalled();
    expect(enhancePhoto).not.toHaveBeenCalled();
    expect(db.update).toHaveBeenCalledWith({ where: { id: 'sub-1' }, data: { images: ['https://x.ufs.sh/f/made.jpg', VIDEO], lastError: null } });
  });

  it('lets the AI see and retouch only the photos, with the video last and no AI picture of it', async () => {
    const written = { ...SERVICE, rawImages: [VIDEO, PHOTO], title: 'Clases de surf', description: 'Con Ana.' };
    db.findUnique.mockResolvedValueOnce({ ...SERVICE, rawImages: [VIDEO, PHOTO] }).mockResolvedValue(written);
    db.update.mockResolvedValue({ ...written, seller: {} });
    (fetchImage as jest.Mock).mockResolvedValue(Buffer.from('photo'));

    await processSubmission('sub-1');

    expect(fetchImage).toHaveBeenCalledWith(PHOTO);
    expect(enhancePhoto).toHaveBeenCalledTimes(1);
    expect(db.update).toHaveBeenCalledWith({
      where: { id: 'sub-1' },
      data: { images: ['https://x.ufs.sh/f/made.jpg', VIDEO], aiImages: ['', 'https://x.ufs.sh/f/made.jpg'], lastError: null },
    });
  });

  it('cleans up each video in use after the pictures, keeping the original to switch back to', async () => {
    const pictured = { ...SERVICE, usesAi: true, rawImages: [VIDEO], images: ['https://x.ufs.sh/f/made.jpg', VIDEO], aiImages: [], title: 'Clases de surf' };
    db.findUnique.mockResolvedValue(pictured);
    db.update.mockResolvedValue({ ...pictured, seller: {} });
    (fetchImage as jest.Mock).mockResolvedValue(Buffer.from('video'));
    (uploadImage as jest.Mock).mockResolvedValueOnce('https://x.ufs.sh/f/clean');

    await processSubmission('sub-1');

    expect(cleanUpVideo).toHaveBeenCalledTimes(1);
    expect(uploadImage).toHaveBeenCalledWith(Buffer.from('clean'), expect.stringContaining('video'), 'video/mp4');
    expect(db.update).toHaveBeenCalledWith({
      where: { id: 'sub-1' },
      data: { images: ['https://x.ufs.sh/f/made.jpg', 'https://x.ufs.sh/f/clean#video'], aiImages: ['https://x.ufs.sh/f/clean#video'] },
    });
  });

  it('keeps the original video when the clean-up fails, and still finishes the listing', async () => {
    const pictured = { ...SERVICE, usesAi: true, rawImages: [VIDEO], images: ['https://x.ufs.sh/f/made.jpg', VIDEO], aiImages: [], title: 'Clases de surf' };
    db.findUnique.mockResolvedValue(pictured);
    db.update.mockResolvedValue({ ...pictured, seller: {} });
    (cleanUpVideo as jest.Mock).mockRejectedValueOnce(new Error('ffmpeg failed'));
    jest.spyOn(console, 'error').mockImplementation(() => {});

    await processSubmission('sub-1');

    expect(db.update).toHaveBeenCalledWith({ where: { id: 'sub-1' }, data: { images: pictured.images, aiImages: [''] } });
    expect(db.update).toHaveBeenLastCalledWith(expect.objectContaining({ data: { status: 'IN_REVIEW', lastError: null } }));
  });

  it('leaves the videos as uploaded when the admin went on without AI', async () => {
    const asUploaded = { ...SERVICE, usesAi: false, rawImages: [VIDEO], images: [VIDEO], aiImages: [], title: 'Clases de surf' };
    db.findUnique.mockResolvedValue(asUploaded);
    db.update.mockResolvedValue({ ...asUploaded, seller: {} });

    await processSubmission('sub-1');

    expect(cleanUpVideo).not.toHaveBeenCalled();
  });
});

describe('makeListingPictures with only a video', () => {
  const still = 'https://x.ufs.sh/f/still.jpg';
  const video = `https://x.ufs.sh/f/clip#video=${encodeURIComponent(still)}`;

  it('makes the shop picture from the video\'s still frame and keeps the video after it', async () => {
    db.findUnique.mockResolvedValue({ ...WANTED, status: 'COLLECTING', type: 'SERVICE', rawImages: [video], images: [] });
    (fetchImage as jest.Mock).mockResolvedValue(Buffer.from('still'));
    (enhancePhoto as jest.Mock).mockResolvedValue(Buffer.from('shop picture'));

    await makeListingPictures('sub-1');

    expect(fetchImage).toHaveBeenCalledWith(still);
    expect(db.update.mock.calls[0][0].data).toMatchObject({ images: ['https://x.ufs.sh/f/made.jpg', video], aiImages: [''] });
  });

  it('waits for the description when the video has no still', async () => {
    db.findUnique.mockResolvedValue({ ...WANTED, status: 'COLLECTING', type: 'SERVICE', rawImages: ['https://x.ufs.sh/f/old#video'], images: [] });

    await makeListingPictures('sub-1');

    expect(enhancePhoto).not.toHaveBeenCalled();
    expect(db.update).not.toHaveBeenCalled();
  });
});
