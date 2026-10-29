import { prisma } from '@/db/prisma';
import { sendButtons, sendList, sendText } from '@/lib/whatsapp-cloud/client';
import { handleSellerMessage } from '@/lib/marketplace/conversation';
import { isRateLimited } from '@/lib/rate-limit';
import { markSold } from '@/lib/marketplace/listing';
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
jest.mock('@/lib/whatsapp-cloud/client', () => ({
  sendText: jest.fn(async () => {}),
  sendButtons: jest.fn(async () => {}),
  sendList: jest.fn(async () => {}),
}));
jest.mock('@/lib/marketplace/listing', () => ({ markSold: jest.fn() }));
jest.mock('@/lib/rate-limit', () => ({ isRateLimited: jest.fn(async () => false) }));

const db = prisma as unknown as {
  seller: { upsert: jest.Mock };
  submission: Record<'findFirst' | 'create' | 'update' | 'deleteMany', jest.Mock>;
};

const SELLER = '34600111222';
const message = (fields: Partial<InboundMessage>): InboundMessage => ({ id: 'm', from: SELLER, type: 'text', ...fields });
const openSubmission = (fields = {}) => ({ id: 'sub-1', type: 'PRODUCT', mediaIds: [], rawImages: [], rawText: '', ...fields });

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

  it('takes the newest live listing down when the person found what they looked for', async () => {
    (markSold as jest.Mock).mockResolvedValue(true);

    await handleSellerMessage(message({ text: '¡Encontrado!' }));

    expect(markSold).toHaveBeenCalledWith('seller-1');
    expect(sendText).toHaveBeenCalledWith(SELLER, expect.stringContaining('encontraste'));
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
    expect(isRateLimited).toHaveBeenCalledWith(expect.objectContaining({ action: 'whatsapp-listing', max: 10, windowMs: 24 * 60 * 60 * 1000 }), SELLER);
  });

  it('keeps the listing open, without AI work, once the number sent too many today', async () => {
    db.submission.findFirst.mockResolvedValue(openSubmission({ mediaIds: ['media-1'] }));
    (isRateLimited as jest.Mock).mockResolvedValueOnce(true);

    const reply = await handleSellerMessage(message({ type: 'button', buttonId: 'done' }));

    expect(reply).toEqual({});
    expect(db.submission.update).not.toHaveBeenCalled();
    expect(sendText).toHaveBeenCalledWith(SELLER, expect.stringContaining('mañana'));
  });

  it('asks an item for sale for a photo when done comes first', async () => {
    db.submission.findFirst.mockResolvedValue(openSubmission());

    const reply = await handleSellerMessage(message({ type: 'button', buttonId: 'done' }));

    expect(reply).toEqual({});
    expect(sendText).toHaveBeenCalledWith(SELLER, expect.stringContaining('foto'));
  });

  it('deletes what was collected on "borrar"', async () => {
    db.submission.deleteMany.mockResolvedValue({ count: 1 });

    await handleSellerMessage(message({ text: 'borrar' }));

    expect(db.submission.deleteMany).toHaveBeenCalledWith({ where: { sellerId: 'seller-1', status: 'COLLECTING' } });
    expect(sendText).toHaveBeenCalledWith(SELLER, expect.stringContaining('borrado'));
  });

  it('answers in English to foreign numbers', async () => {
    db.submission.findFirst.mockResolvedValue(openSubmission());

    await handleSellerMessage(message({ from: '447700111222', type: 'image', mediaId: 'media-1' }));

    expect(sendButtons).toHaveBeenCalledWith('447700111222', expect.stringContaining('Photo received'), [{ id: 'done', title: '✅ Done' }]);
  });
});

describe('the welcome and the choice', () => {
  const CHECKLIST_END = 'Con eso te preparo el anuncio y te lo enseño antes de publicarlo.';
  // The submission as the update leaves it, so the replies see the new type and text.
  const updateReturnsData = (fields = {}) =>
    db.submission.update.mockImplementation(async ({ data }) => ({ ...openSubmission(fields), ...data }));

  it('greets someone new with the question and the four choices as a list, keeping nothing yet', async () => {
    db.submission.findFirst.mockResolvedValue(null);

    await handleSellerMessage(message({ text: 'Buenos días', profileName: 'Ana' }));

    expect(db.seller.upsert).toHaveBeenCalledWith(expect.objectContaining({ create: { waId: SELLER, name: 'Ana' } }));
    expect(db.submission.create).not.toHaveBeenCalled();
    expect(sendList).toHaveBeenCalledWith(
      SELLER,
      expect.stringContaining(
        '¡Hola! 👋 Gracias por escribir a Baifo. ¿Qué quieres publicar?\n1. Algo que vendes\n2. Algo que buscas\n3. Un servicio o clase\n4. Un evento o taller\n\nContesta con el número y te digo qué necesito.'
      ),
      'Elegir',
      [
        { id: 'type:PRODUCT', title: 'Algo que vendes' },
        { id: 'type:WANTED', title: 'Algo que buscas' },
        { id: 'type:SERVICE', title: 'Un servicio o clase' },
        { id: 'type:EVENT', title: 'Un evento o taller' },
      ]
    );
  });

  it('greets again on "hola", even with something open', async () => {
    await handleSellerMessage(message({ text: '¡Hola!' }));

    expect(sendList).toHaveBeenCalledWith(SELLER, expect.stringContaining('¿Qué quieres publicar?'), 'Elegir', expect.any(Array));
    expect(db.submission.update).not.toHaveBeenCalled();
  });

  it('takes the choice from the list and answers with its checklist', async () => {
    db.submission.findFirst.mockResolvedValue(null);
    db.submission.create.mockResolvedValue(openSubmission());
    updateReturnsData();

    await handleSellerMessage(message({ type: 'button', buttonId: 'type:EVENT', text: 'Un evento o taller' }));

    expect(db.submission.create).toHaveBeenCalledWith({ data: { sellerId: 'seller-1' } });
    expect(db.submission.update).toHaveBeenCalledWith({ where: { id: 'sub-1' }, data: { type: 'EVENT' } });
    expect(sendText).toHaveBeenCalledWith(
      SELLER,
      'Perfecto. Mándame:\n📝 El título\n📅 Fecha y hora\n📍 La dirección\n🎫 La entrada (0 = gratis)\n💬 Una descripción\n📸 El cartel o una foto\n\n' + CHECKLIST_END
    );
  });

  it.each([
    ['1', 'PRODUCT', 'Perfecto. Mándame:\n📸 De 1 a 5 fotos\n📝 Qué es\n✨ Cómo está: nuevo, como nuevo, bueno o aceptable\n💶 El precio\n📍 La zona'],
    ['2', 'WANTED', 'Perfecto. Cuéntame:\n🔎 Qué buscas\n✨ En qué estado te vale\n💶 Tu presupuesto (desde–hasta)\n📍 La zona\n📸 Una foto, si tienes (si no, la creamos nosotros)'],
    ['3.', 'SERVICE', 'Perfecto. Cuéntame:\n📝 Qué ofreces\n🧭 Si es una clase, un servicio o un acompañamiento\n💶 Precio «a partir de» (si quieres ponerlo)\n📍 La zona\n📸 Una foto o tu logo'],
    ['Evento', 'EVENT', 'Perfecto. Mándame:\n📝 El título'],
  ])('takes "%s" typed as the choice %s', async (text, type, checklist) => {
    db.submission.findFirst.mockResolvedValue(openSubmission());
    updateReturnsData();

    await handleSellerMessage(message({ text }));

    expect(db.submission.update).toHaveBeenCalledWith({ where: { id: 'sub-1' }, data: { type } });
    expect(sendText).toHaveBeenCalledWith(SELLER, expect.stringContaining(checklist));
    expect(sendText).toHaveBeenCalledWith(SELLER, expect.stringMatching(new RegExp(`${CHECKLIST_END}$`)));
  });

  it('keeps a sentence that names the choice as the start of the description, ready for done', async () => {
    db.submission.findFirst.mockResolvedValue(null);
    db.submission.create.mockResolvedValue(openSubmission());
    updateReturnsData();

    await handleSellerMessage(message({ text: 'Busco una tabla de surf, hasta 150€' }));

    expect(db.submission.update).toHaveBeenCalledWith({
      where: { id: 'sub-1' },
      data: { type: 'WANTED', rawText: 'Busco una tabla de surf, hasta 150€' },
    });
    expect(sendButtons).toHaveBeenCalledWith(SELLER, expect.stringContaining('Cuéntame:\n🔎 Qué buscas'), [{ id: 'done', title: '✅ Listo' }]);
  });

  it('reads a number as part of the description once something was sent', async () => {
    db.submission.findFirst.mockResolvedValue(openSubmission({ mediaIds: ['media-1'], rawText: 'Mesa' }));
    updateReturnsData({ mediaIds: ['media-1'] });

    await handleSellerMessage(message({ text: '2' }));

    expect(db.submission.update).toHaveBeenCalledWith({ where: { id: 'sub-1' }, data: { rawText: 'Mesa\n2' } });
    expect(sendButtons).toHaveBeenCalledWith(SELLER, expect.stringContaining('Apuntado'), [{ id: 'done', title: '✅ Listo' }]);
  });

  it('still takes a photo sent before any choice, as an item for sale', async () => {
    db.submission.findFirst.mockResolvedValue(null);
    db.submission.create.mockResolvedValue(openSubmission());

    await handleSellerMessage(message({ type: 'image', mediaId: 'media-1' }));

    expect(db.submission.create).toHaveBeenCalledWith({ data: { sellerId: 'seller-1' } });
    expect(db.submission.update).toHaveBeenCalledWith({ where: { id: 'sub-1' }, data: { mediaIds: { push: 'media-1' } } });
    expect(sendButtons).toHaveBeenCalledWith(SELLER, expect.stringContaining('Foto recibida'), [{ id: 'done', title: '✅ Listo' }]);
  });

  it('asks an item for sale described in words for its photo', async () => {
    db.submission.findFirst.mockResolvedValue(openSubmission());
    updateReturnsData();

    await handleSellerMessage(message({ text: 'Mesa de teca, 80€' }));

    expect(sendText).toHaveBeenCalledWith(SELLER, expect.stringContaining('foto'));
    expect(sendButtons).not.toHaveBeenCalled();
  });

  it.each(['WANTED', 'SERVICE', 'EVENT'])('lets a %s listing go on done with words only', async (type) => {
    db.submission.findFirst.mockResolvedValue(openSubmission({ type, rawText: 'Clases de surf en Corralejo' }));

    const reply = await handleSellerMessage(message({ type: 'button', buttonId: 'done' }));

    expect(db.submission.update).toHaveBeenCalledWith({ where: { id: 'sub-1' }, data: { status: 'PROCESSING' } });
    expect(reply).toEqual({ shouldProcess: 'sub-1' });
  });

  it('asks a listing without photo or words for its checklist again on done', async () => {
    db.submission.findFirst.mockResolvedValue(openSubmission({ type: 'SERVICE' }));

    const reply = await handleSellerMessage(message({ type: 'button', buttonId: 'done' }));

    expect(reply).toEqual({});
    expect(sendText).toHaveBeenCalledWith(SELLER, expect.stringContaining('📝 Qué ofreces'));
  });

  it('keeps every list row title within WhatsApp\'s 24 characters', async () => {
    for (const from of ['34600111222', '447700111222', '39333111222', '33600111222', '49151111222']) {
      jest.clearAllMocks();
      db.seller.upsert.mockResolvedValue({ id: 'seller-1' });
      db.submission.findFirst.mockResolvedValue(null);
      await handleSellerMessage(message({ from, text: 'hey' }));
      const rows = (sendList as jest.Mock).mock.calls[0][3] as { title: string }[];
      expect(rows.every(({ title }) => title.length <= 24)).toBe(true);
    }
  });
});
