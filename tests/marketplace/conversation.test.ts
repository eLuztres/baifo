import { prisma } from '@/db/prisma';
import { sendButtons, sendText } from '@/lib/whatsapp-cloud/client';
import { handleSellerMessage } from '@/lib/marketplace/conversation';
import type { InboundMessage } from '@/lib/whatsapp-cloud/webhook';

jest.mock('@/db/prisma', () => {
  const submission = { findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), deleteMany: jest.fn() };
  return {
    prisma: {
      seller: { upsert: jest.fn() },
      submission,
      $transaction: jest.fn((run: (tx: unknown) => unknown) => run({ $executeRaw: jest.fn(), submission })),
    },
  };
});
jest.mock('@/lib/whatsapp-cloud/client', () => ({ sendText: jest.fn(async () => {}), sendButtons: jest.fn(async () => {}) }));
jest.mock('@/lib/marketplace/listing', () => ({ markSold: jest.fn() }));

const db = prisma as unknown as {
  seller: { upsert: jest.Mock };
  submission: Record<'findFirst' | 'create' | 'update' | 'deleteMany', jest.Mock>;
};

const SELLER = '34600111222';
const message = (fields: Partial<InboundMessage>): InboundMessage => ({ id: 'm', from: SELLER, type: 'text', ...fields });
const openSubmission = (fields = {}) => ({ id: 'sub-1', mediaIds: [], rawImages: [], rawText: '', ...fields });

beforeEach(() => {
  jest.clearAllMocks();
  db.seller.upsert.mockResolvedValue({ id: 'seller-1' });
});

describe('handleSellerMessage', () => {
  it('collects the first photo and offers the done button', async () => {
    db.submission.findFirst.mockResolvedValue(openSubmission());

    await handleSellerMessage(message({ type: 'image', mediaId: 'media-1', text: '20€' }));

    expect(db.submission.update).toHaveBeenCalledWith({
      where: { id: 'sub-1' },
      data: { mediaIds: { push: 'media-1' }, rawText: '20€' },
    });
    expect(sendButtons).toHaveBeenCalledWith(SELLER, expect.stringContaining('Foto recibida'), [{ id: 'done', title: '✅ Listo' }]);
  });

  it('stays quiet for the other photos of an album', async () => {
    db.submission.findFirst.mockResolvedValue(openSubmission({ mediaIds: ['media-1'] }));

    await handleSellerMessage(message({ type: 'image', mediaId: 'media-2' }));

    expect(sendButtons).not.toHaveBeenCalled();
    expect(sendText).not.toHaveBeenCalled();
  });

  it('starts processing when the seller taps done after sending a photo', async () => {
    db.submission.findFirst.mockResolvedValue(openSubmission({ mediaIds: ['media-1'] }));

    const reply = await handleSellerMessage(message({ type: 'button', buttonId: 'done' }));

    expect(db.submission.update).toHaveBeenCalledWith({ where: { id: 'sub-1' }, data: { status: 'PROCESSING' } });
    expect(reply).toEqual({ shouldProcess: 'sub-1' });
  });

  it('asks for a photo when done comes first', async () => {
    db.submission.findFirst.mockResolvedValue(openSubmission());

    const reply = await handleSellerMessage(message({ type: 'button', buttonId: 'done' }));

    expect(reply).toEqual({});
    expect(sendText).toHaveBeenCalledWith(SELLER, expect.stringContaining('foto'));
  });

  it('opens a submission when there is none and greets a new seller', async () => {
    db.submission.findFirst.mockResolvedValue(null);
    db.submission.create.mockResolvedValue(openSubmission());

    await handleSellerMessage(message({ text: 'Hola, quiero vender una bici', profileName: 'Ana' }));

    expect(db.seller.upsert).toHaveBeenCalledWith(expect.objectContaining({ create: { waId: SELLER, name: 'Ana' } }));
    expect(db.submission.create).toHaveBeenCalledWith({ data: { sellerId: 'seller-1' } });
    expect(sendText).toHaveBeenCalledWith(SELLER, expect.stringContaining('Soy Baifo'));
  });

  it('deletes what was collected on "borrar"', async () => {
    db.submission.deleteMany.mockResolvedValue({ count: 1 });

    await handleSellerMessage(message({ text: 'borrar' }));

    expect(db.submission.deleteMany).toHaveBeenCalledWith({ where: { sellerId: 'seller-1', status: 'COLLECTING' } });
    expect(sendText).toHaveBeenCalledWith(SELLER, expect.stringContaining('borrado'));
  });

  it('answers in English to foreign numbers', async () => {
    db.submission.findFirst.mockResolvedValue(openSubmission());

    await handleSellerMessage(message({ from: '49170111222', type: 'image', mediaId: 'media-1' }));

    expect(sendButtons).toHaveBeenCalledWith('49170111222', expect.stringContaining('Photo received'), [{ id: 'done', title: '✅ Done' }]);
  });
});
