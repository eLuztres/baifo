import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { createCategory, deleteCategory, updateCategory } from '@/lib/actions/category.actions';

jest.mock('@/auth', () => ({ auth: jest.fn(), signIn: jest.fn(), signOut: jest.fn() }));
jest.mock('@/db/prisma', () => ({
  prisma: {
    category: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      aggregate: jest.fn().mockResolvedValue({ _max: { sortOrder: 7 } }),
    },
  },
}));
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));
jest.mock('next/headers', () => ({ cookies: jest.fn(), headers: jest.fn() }));

const mockAuth = auth as unknown as jest.Mock;
const db = (prisma as unknown as { category: Record<string, jest.Mock> }).category;

const ADMIN = { user: { id: 'admin-1', role: 'admin' } };
const CUSTOMER = { user: { id: 'u1', role: 'user' } };
const CATEGORY_ID = '6f1c2a4e-1b2c-4d3e-8f90-123456789abc';

const CATEGORY = {
  slug: 'carbon',
  name: { es: 'Carbono', en: 'Carbon' },
  text: { es: 'Fibra de carbono.' },
  image: null,
  keywords: ['Carbono', 'fibra'],
  scene: 'in a dark space-like scene on a carbon-weave surface',
  sceneVariants: ['faint nebula bokeh behind the ring'],
};

beforeEach(() => jest.clearAllMocks());

describe('category actions', () => {
  it.each([
    ['createCategory', () => createCategory(CATEGORY), () => db.create],
    ['updateCategory', () => updateCategory({ ...CATEGORY, id: CATEGORY_ID }), () => db.update],
    ['deleteCategory', () => deleteCategory(CATEGORY_ID), () => db.delete],
  ])('%s refuses non-admins', async (_, action, write) => {
    mockAuth.mockResolvedValue(CUSTOMER);
    await expect(action()).resolves.toEqual({ success: false, message: 'ERROR_ADMIN_ONLY' });
    expect(write()).not.toHaveBeenCalled();
  });

  it('adds a new category at the end of the ring, with lower-case keywords', async () => {
    mockAuth.mockResolvedValue(ADMIN);
    await expect(createCategory(CATEGORY)).resolves.toMatchObject({ success: true });
    expect(db.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ sortOrder: 8, keywords: ['carbono', 'fibra'] }),
    });
  });

  it('rejects a category without any name', async () => {
    mockAuth.mockResolvedValue(ADMIN);
    const result = await createCategory({ ...CATEGORY, name: { es: '', en: '' } });
    expect(result).toEqual({ success: false, message: 'VALIDATION_CATEGORY_NAME' });
    expect(db.create).not.toHaveBeenCalled();
  });

  it('returns the rings to redo only when the scene changed', async () => {
    mockAuth.mockResolvedValue(ADMIN);
    db.findUnique.mockResolvedValue({ ...CATEGORY, products: [{ id: 'p1' }, { id: 'p2' }] });

    const sameScene = await updateCategory({ ...CATEGORY, id: CATEGORY_ID, name: { es: 'Carbono puro' } });
    expect(sameScene).toMatchObject({ success: true, ringIds: [] });

    const newScene = await updateCategory({ ...CATEGORY, id: CATEGORY_ID, sceneVariants: ['cold blue rim light'] });
    expect(newScene).toMatchObject({ success: true, ringIds: ['p1', 'p2'] });
  });
});
