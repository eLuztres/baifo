import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { deleteOffer, endOffer, saveOffer } from '@/lib/actions/offer.actions';
import { translateText } from '@/lib/marketplace/ai';

jest.mock('@/auth', () => ({ auth: jest.fn(), signIn: jest.fn(), signOut: jest.fn() }));
jest.mock('@/db/prisma', () => ({
  prisma: { offer: { create: jest.fn(), update: jest.fn(), delete: jest.fn() } },
}));
jest.mock('@/lib/i18n-server', () => ({ getEnabledLocales: () => ['es', 'en'], getShopLocale: () => 'es' }));
jest.mock('@/lib/marketplace/ai', () => ({ translateText: jest.fn() }));
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));
jest.mock('next/headers', () => ({ cookies: jest.fn(), headers: jest.fn() }));

const mockAuth = auth as unknown as jest.Mock;
const mockTranslate = translateText as unknown as jest.Mock;
const db = (prisma as unknown as { offer: Record<string, jest.Mock> }).offer;
const ADMIN = { user: { id: 'admin-1', role: 'admin' } };
const ID = '6f1c2a4e-1b2c-4d3e-8f90-123456789abc';
const OFFER = {
  title: 'Estudiantes',
  text: 'Un mes gratis',
  audience: 'Estudiantes',
  icon: 'GraduationCap' as const,
  linkUrl: '',
  startsAt: '2026-11-01T09:00',
  endsAt: '2026-11-30T23:59',
  sortOrder: 0,
  isActive: true,
};

beforeEach(() => jest.clearAllMocks());

describe('saveOffer', () => {
  it('refuses non-admins', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'user' } });
    await expect(saveOffer(OFFER)).resolves.toEqual({ success: false, message: 'ERROR_ADMIN_ONLY' });
    expect(db.create).not.toHaveBeenCalled();
  });

  it('stores the texts translated and the dates on the shop clock', async () => {
    mockAuth.mockResolvedValue(ADMIN);
    mockTranslate.mockResolvedValue({ en: { title: 'Students', description: 'One month free', short: 'Students' } });
    await expect(saveOffer(OFFER)).resolves.toMatchObject({ success: true });
    expect(db.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: { en: 'Students', es: 'Estudiantes' },
        text: { en: 'One month free', es: 'Un mes gratis' },
        audience: { en: 'Students', es: 'Estudiantes' },
        linkUrl: null,
        startsAt: new Date('2026-11-01T09:00:00Z'),
      }),
    });
  });

  it("keeps the shop's language when the AI fails", async () => {
    mockAuth.mockResolvedValue(ADMIN);
    mockTranslate.mockRejectedValue(new Error('no key'));
    jest.spyOn(console, 'error').mockImplementation(() => {});
    await saveOffer({ ...OFFER, id: ID, audience: '' });
    expect(db.update).toHaveBeenCalledWith({
      where: { id: ID },
      data: expect.objectContaining({ title: { es: 'Estudiantes' }, audience: {} }),
    });
  });

  it('refuses an end before the start', async () => {
    mockAuth.mockResolvedValue(ADMIN);
    await expect(saveOffer({ ...OFFER, endsAt: '2026-10-01T00:00' })).resolves.toMatchObject({ success: false });
    expect(db.create).not.toHaveBeenCalled();
  });
});

describe('endOffer and deleteOffer', () => {
  it('ends an offer now, for admins only', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'user' } });
    await expect(endOffer(ID)).resolves.toMatchObject({ success: false });
    mockAuth.mockResolvedValue(ADMIN);
    await expect(endOffer(ID)).resolves.toEqual({ success: true, message: 'OFFERS_ADMIN_ENDED' });
    expect(db.update).toHaveBeenCalledWith({ where: { id: ID }, data: { endsAt: expect.any(Date) } });
  });

  it('deletes an offer', async () => {
    mockAuth.mockResolvedValue(ADMIN);
    await expect(deleteOffer(ID)).resolves.toEqual({ success: true, message: 'OFFERS_ADMIN_DELETED' });
    expect(db.delete).toHaveBeenCalledWith({ where: { id: ID } });
  });
});
