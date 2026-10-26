import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { createCategory, deleteCategory, improveCategory, setProductCategory, translateCategory, updateCategory } from '@/lib/actions/category.actions';
import { translateText, writeCategoryText } from '@/lib/marketplace/ai';

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
    product: { update: jest.fn() },
  },
}));
jest.mock('@/lib/marketplace/ai', () => ({ translateText: jest.fn(), writeCategoryText: jest.fn() }));
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

describe('a category without the jewellery extras', () => {
  it('is saved with only a name: no text and no photo scene', async () => {
    mockAuth.mockResolvedValue(ADMIN);
    const plain = { ...CATEGORY, text: {}, scene: '', sceneVariants: [], keywords: [] };
    await expect(createCategory(plain)).resolves.toMatchObject({ success: true });
  });

  it('still refuses a photo scene too short to say anything', async () => {
    mockAuth.mockResolvedValue(ADMIN);
    await expect(createCategory({ ...CATEGORY, scene: 'beach' })).resolves.toMatchObject({ success: false });
  });
});

describe('translateCategory', () => {
  it('turns the translated title and description into name and text per language', async () => {
    mockAuth.mockResolvedValue(ADMIN);
    (translateText as jest.Mock).mockResolvedValue({ it: { title: 'Servizi', description: 'Aiuto a casa' } });
    await expect(translateCategory({ name: 'Servicios', text: 'Ayuda en casa' })).resolves.toEqual({
      success: true,
      message: '',
      texts: { it: { name: 'Servizi', text: 'Aiuto a casa' } },
    });
  });

  it('refuses non-admins', async () => {
    mockAuth.mockResolvedValue(CUSTOMER);
    await expect(translateCategory({ name: 'Servicios', text: '' })).resolves.toMatchObject({ success: false });
    expect(translateText).not.toHaveBeenCalled();
  });
});

describe('improveCategory', () => {
  it('returns the AI description with the name in every language, cut to what a category can save', async () => {
    mockAuth.mockResolvedValue(ADMIN);
    (writeCategoryText as jest.Mock).mockResolvedValue({
      es: { title: 'Busco', description: 'x'.repeat(400) },
      it: { title: 'Cerco', description: 'Chi cerca qualcosa' },
    });
    const result = await improveCategory({ name: 'Busco', text: 'gente que busca cosas' });
    expect(result).toMatchObject({ success: true, texts: { it: { name: 'Cerco', text: 'Chi cerca qualcosa' } } });
    expect((result as { texts: Record<string, { text: string }> }).texts.es.text).toHaveLength(300);
  });

  it('refuses non-admins', async () => {
    mockAuth.mockResolvedValue(CUSTOMER);
    await expect(improveCategory({ name: 'Busco', text: '' })).resolves.toMatchObject({ success: false });
    expect(writeCategoryText).not.toHaveBeenCalled();
  });
});

describe('setProductCategory', () => {
  const PRODUCT_ID = '1a2b3c4d-1b2c-4d3e-8f90-123456789abc';
  const products = (prisma as unknown as { product: Record<string, jest.Mock> }).product;

  it('connects a listing to a category and takes it out again', async () => {
    mockAuth.mockResolvedValue(ADMIN);
    await setProductCategory(PRODUCT_ID, CATEGORY_ID, true);
    expect(products.update).toHaveBeenCalledWith({ where: { id: PRODUCT_ID }, data: { categories: { connect: { id: CATEGORY_ID } } } });
    await setProductCategory(PRODUCT_ID, CATEGORY_ID, false);
    expect(products.update).toHaveBeenLastCalledWith({ where: { id: PRODUCT_ID }, data: { categories: { disconnect: { id: CATEGORY_ID } } } });
  });

  it('refuses non-admins', async () => {
    mockAuth.mockResolvedValue(CUSTOMER);
    await expect(setProductCategory(PRODUCT_ID, CATEGORY_ID, true)).resolves.toMatchObject({ success: false });
    expect(products.update).not.toHaveBeenCalled();
  });
});
