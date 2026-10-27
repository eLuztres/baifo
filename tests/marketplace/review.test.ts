import { prisma } from '@/db/prisma';
import { handleAdminText, handleReviewButton } from '@/lib/marketplace/review';
import { sendText } from '@/lib/whatsapp-cloud/client';

jest.mock('@/lib/whatsapp-cloud/client', () => ({ sendText: jest.fn(), sendButtons: jest.fn() }));
jest.mock('@/lib/marketplace/catalog', () => ({ getListingCategories: jest.fn(async () => []), findCategory: jest.fn(), categoryName: jest.fn(() => '') }));
jest.mock('@/db/prisma', () => ({
  prisma: { submission: { findFirst: jest.fn(), update: jest.fn(), updateMany: jest.fn(), count: jest.fn(async () => 0) } },
}));

const db = (prisma as unknown as { submission: Record<'findFirst' | 'update' | 'updateMany', jest.Mock> }).submission;
const send = sendText as jest.Mock;

const ADMIN = '34600000000';
const SELLER = { waId: '34611111111' };
const LISTING = { id: 'sub-1', title: 'Mesa de teca', status: 'IN_REVIEW', seller: SELLER, images: [], rawImages: [] };

beforeEach(() => jest.clearAllMocks());

describe('rejecting a listing on WhatsApp', () => {
  it('asks the admin for the reason instead of rejecting right away', async () => {
    db.updateMany.mockResolvedValue({ count: 1 });

    await handleReviewButton('reject', 'sub-1', ADMIN);

    expect(db.updateMany).toHaveBeenCalledWith({ where: { id: 'sub-1', status: 'IN_REVIEW' }, data: { rejectAskedAt: expect.any(Date) } });
    expect(db.update).not.toHaveBeenCalled();
    expect(send).toHaveBeenCalledWith(ADMIN, expect.stringContaining('¿Por qué lo rechazas?'));
  });

  it('sends the seller the reason the admin writes next, in the seller’s language', async () => {
    db.findFirst.mockResolvedValue(LISTING);

    await handleAdminText('Las fotos están borrosas', ADMIN);

    expect(db.update).toHaveBeenCalledWith({ where: { id: 'sub-1' }, data: { status: 'REJECTED', rejectReason: 'Las fotos están borrosas', rejectAskedAt: null } });
    expect(send).toHaveBeenCalledWith(SELLER.waId, expect.stringContaining('Motivo: Las fotos están borrosas'));
    expect(send).toHaveBeenCalledWith(ADMIN, '❌ Rechazado, motivo enviado: Mesa de teca');
  });

  it('sends only the polite message for "sin motivo"', async () => {
    db.findFirst.mockResolvedValue(LISTING);

    await handleAdminText('Sin motivo', ADMIN);

    expect(db.update.mock.calls[0][0].data.rejectReason).toBeNull();
    expect(send).toHaveBeenCalledWith(SELLER.waId, 'Lo sentimos, no podemos publicar este anuncio. Si tienes dudas, contéstanos aquí.');
  });

  it('keeps the listing in review for "cancelar"', async () => {
    db.findFirst.mockResolvedValue(LISTING);

    await handleAdminText('cancelar', ADMIN);

    expect(db.update).toHaveBeenCalledWith({ where: { id: 'sub-1' }, data: { rejectAskedAt: null } });
    expect(send).not.toHaveBeenCalledWith(SELLER.waId, expect.anything());
  });

  it('treats a text as an edit again when no rejection is waiting for its reason', async () => {
    db.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(LISTING);
    db.update.mockResolvedValue({ ...LISTING, price: '25.00' });

    await handleAdminText('precio 25', ADMIN);

    expect(db.update).toHaveBeenCalledWith(expect.objectContaining({ data: { price: '25.00' } }));
  });
});
