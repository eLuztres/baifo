import { prisma } from '@/db/prisma';
import { isAdmin } from '@/lib/auth-guard';
import { getAdminProductPreview } from '@/lib/marketplace/admin-preview';
import { adminPreviewSlug, isAdminPreviewSlug } from '@/lib/marketplace/preview-slug';

jest.mock('@/lib/auth-guard', () => ({ isAdmin: jest.fn(async () => true) }));
jest.mock('@/db/prisma', () => ({ prisma: { submission: { findUnique: jest.fn() } } }));

const ID = 'ff25bd1e-d82d-4561-8ca2-337545aa373e';
const findUnique = (prisma as unknown as { submission: { findUnique: jest.Mock } }).submission.findUnique;

const LISTING = {
  id: ID,
  title: 'Guitarra clásica',
  shortTitle: 'Guitarra',
  description: 'Bastante usada.',
  translations: { en: { title: 'Classical guitar', description: 'Well used.' } },
  category: 'musica',
  images: ['https://x.ufs.sh/f/guitar.jpg'],
  rawImages: [],
  price: { toString: () => '40' },
  priceMode: 'FIXED',
  type: 'PRODUCT',
  sellerName: 'Lula',
  sellerLocale: null,
  seller: { waId: '34612345678', name: 'Lula' },
};

beforeEach(() => jest.clearAllMocks());

describe('admin preview', () => {
  it('only counts vista-<listing id>, never a product named "Vista al mar"', () => {
    expect(isAdminPreviewSlug(adminPreviewSlug(ID))).toBe(true);
    expect(isAdminPreviewSlug('vista-al-mar-1a2b3c')).toBe(false);
  });

  it('shows the admin a listing that is not online, shaped like its product', async () => {
    findUnique.mockResolvedValue(LISTING);

    expect(await getAdminProductPreview(adminPreviewSlug(ID))).toMatchObject({
      id: ID,
      name: 'Guitarra clásica',
      price: '40',
      priceMode: 'FIXED',
      translations: { en: { name: 'Classical guitar', description: 'Well used.' } },
      submission: { sellerName: 'Lula' },
    });
  });

  it('shows nothing to anyone else, and nothing for another address', async () => {
    findUnique.mockResolvedValue(LISTING);
    (isAdmin as jest.Mock).mockResolvedValueOnce(false);

    expect(await getAdminProductPreview(adminPreviewSlug(ID))).toBeNull();
    expect(await getAdminProductPreview('vista-al-mar-1a2b3c')).toBeNull();
    expect(findUnique).not.toHaveBeenCalled();
  });
});
