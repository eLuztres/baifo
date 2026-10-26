import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { saveCorral, savePlace } from '@/lib/actions/place.actions';
import { translateText } from '@/lib/marketplace/ai';

jest.mock('@/auth', () => ({ auth: jest.fn(), signIn: jest.fn(), signOut: jest.fn() }));
jest.mock('@/db/prisma', () => ({
  prisma: {
    place: { create: jest.fn(), update: jest.fn(), aggregate: jest.fn(async () => ({ _max: { sortOrder: 4 } })) },
    corral: { upsert: jest.fn() },
  },
}));
jest.mock('@/lib/i18n-server', () => ({ getEnabledLocales: () => ['es', 'en'], getShopLocale: () => 'es' }));
jest.mock('@/lib/marketplace/ai', () => ({ translateText: jest.fn() }));
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));
jest.mock('next/headers', () => ({ cookies: jest.fn(), headers: jest.fn() }));

const mockAuth = auth as unknown as jest.Mock;
const db = (prisma as unknown as { place: Record<string, jest.Mock> }).place;
const ADMIN = { user: { id: 'admin-1', role: 'admin' } };
const PLACE = { name: 'Lajares', isLive: false, x: 62.5, y: 18 };

beforeEach(() => jest.clearAllMocks());

describe('savePlace', () => {
  it('refuses non-admins', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'user' } });
    await expect(savePlace(PLACE)).resolves.toEqual({ success: false, message: 'ERROR_ADMIN_ONLY' });
    expect(db.create).not.toHaveBeenCalled();
  });

  it('adds a new place at the end, named the same in every language', async () => {
    mockAuth.mockResolvedValue(ADMIN);
    await expect(savePlace(PLACE)).resolves.toMatchObject({ success: true });
    expect(db.create).toHaveBeenCalledWith({
      data: { slug: 'lajares', name: { es: 'Lajares', en: 'Lajares' }, isLive: false, x: 62.5, y: 18, sortOrder: 5 },
    });
  });

  it('updates an existing place, e.g. switching it live', async () => {
    mockAuth.mockResolvedValue(ADMIN);
    const id = '6f1c2a4e-1b2c-4d3e-8f90-123456789abc';
    await savePlace({ ...PLACE, id, isLive: true });
    expect(db.update).toHaveBeenCalledWith({ where: { id }, data: { name: { es: 'Lajares', en: 'Lajares' }, isLive: true, x: 62.5, y: 18 } });
  });

  it('refuses a pin outside the island picture', async () => {
    mockAuth.mockResolvedValue(ADMIN);
    await expect(savePlace({ ...PLACE, x: 140 })).resolves.toMatchObject({ success: false });
    expect(db.create).not.toHaveBeenCalled();
  });
});

describe('saveCorral', () => {
  const PLACE_ID = '6f1c2a4e-1b2c-4d3e-8f90-123456789abc';
  const corrals = (prisma as unknown as { corral: Record<string, jest.Mock> }).corral;
  const CORRAL = {
    name: 'Corral de Corralejo',
    address: 'Calle Juan Sebastián Elcano 12, Corralejo',
    venue: 'Coworkingpunto',
    text: 'Ven a vernos',
    hours: 'Lun–Vie 10–14h',
    lat: 28.73,
    lng: -13.87,
    hostName: 'Chantal',
    hostImage: '/brand/corral/corralejo-host.jpg',
    image: '',
    whatsapp: '+34 641 161 957',
    phone: '',
    email: '',
  };

  it('refuses non-admins', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'user' } });
    await expect(saveCorral(PLACE_ID, CORRAL)).resolves.toMatchObject({ success: false, message: 'ERROR_ADMIN_ONLY' });
    expect(corrals.upsert).not.toHaveBeenCalled();
  });

  it('stores welcome and hours in every language, empty fields as nothing', async () => {
    mockAuth.mockResolvedValue(ADMIN);
    (translateText as jest.Mock).mockResolvedValue({ en: { title: 'Mon–Fri 10–2pm', description: 'Come and see us' } });

    await expect(saveCorral(PLACE_ID, CORRAL)).resolves.toMatchObject({ success: true });
    const { create } = corrals.upsert.mock.calls[0][0];
    expect(create).toMatchObject({
      placeId: PLACE_ID,
      text: { es: 'Ven a vernos', en: 'Come and see us' },
      hours: { es: 'Lun–Vie 10–14h', en: 'Mon–Fri 10–2pm' },
      image: null,
      phone: null,
      email: null,
    });
  });

  it('still saves in the shop language when the translation fails', async () => {
    mockAuth.mockResolvedValue(ADMIN);
    (translateText as jest.Mock).mockRejectedValue(new Error('429 no credits'));
    jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(saveCorral(PLACE_ID, CORRAL)).resolves.toMatchObject({ success: true });
    expect(corrals.upsert.mock.calls[0][0].create.text).toEqual({ es: 'Ven a vernos' });
  });

  it('refuses a photo from anywhere else', async () => {
    mockAuth.mockResolvedValue(ADMIN);
    await expect(saveCorral(PLACE_ID, { ...CORRAL, hostImage: 'http://example.com/x.jpg' })).resolves.toMatchObject({ success: false });
    expect(corrals.upsert).not.toHaveBeenCalled();
  });
});
