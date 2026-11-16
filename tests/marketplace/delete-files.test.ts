import { prisma } from '@/db/prisma';
import { deleteListingFiles } from '@/lib/marketplace/media';

const mockDeleteFiles = jest.fn(async () => ({ success: true }));
jest.mock('uploadthing/server', () => ({ UTApi: jest.fn(() => ({ deleteFiles: mockDeleteFiles })), UTFile: jest.fn() }));
jest.mock('@/lib/whatsapp-cloud/client', () => ({ downloadMedia: jest.fn() }));
jest.mock('@/db/prisma', () => ({
  prisma: {
    submission: { findMany: jest.fn(async () => []) },
    product: { findMany: jest.fn(async () => []) },
    mercadillo: { findMany: jest.fn(async () => []) },
  },
}));

const db = prisma as unknown as Record<'submission' | 'product' | 'mercadillo', { findMany: jest.Mock }>;

beforeEach(() => {
  jest.clearAllMocks();
  for (const table of Object.values(db)) table.findMany.mockResolvedValue([]);
});

describe('deleteListingFiles', () => {
  it('deletes each file once, a video together with its still frame', async () => {
    await deleteListingFiles([
      'https://app1.ufs.sh/f/photo1',
      'https://app1.ufs.sh/f/photo1',
      `https://app1.ufs.sh/f/clip1#video=${encodeURIComponent('https://app1.ufs.sh/f/still1')}`,
    ]);
    expect(mockDeleteFiles).toHaveBeenCalledWith(['photo1', 'clip1', 'still1']);
  });

  it('keeps a picture that a Mercadillo or another listing still shows, compared by its file key', async () => {
    db.mercadillo.findMany.mockResolvedValue([{ image: 'https://utfs.io/f/cover', icon: null }]);
    // The same file under another host, and a still frame stored as a plain photo elsewhere.
    db.product.findMany.mockResolvedValue([{ images: ['https://utfs.io/f/copied', 'https://app1.ufs.sh/f/still1'] }]);
    db.submission.findMany.mockResolvedValue([{ rawImages: [], images: [], aiImages: [''] }]);
    await deleteListingFiles([
      'https://app1.ufs.sh/f/cover',
      'https://app1.ufs.sh/f/copied',
      `https://app1.ufs.sh/f/clip1#video=${encodeURIComponent('https://app1.ufs.sh/f/still1')}`,
      'https://app1.ufs.sh/f/own',
    ]);
    expect(mockDeleteFiles).toHaveBeenCalledWith(['clip1', 'own']);
  });

  it('never touches a file that is not on UploadThing', async () => {
    await deleteListingFiles(['/showcase/demo.jpg', 'https://example.com/f/abc', '']);
    expect(mockDeleteFiles).not.toHaveBeenCalled();
  });

  it('does nothing for a listing without pictures', async () => {
    await deleteListingFiles([]);
    expect(mockDeleteFiles).not.toHaveBeenCalled();
    expect(db.submission.findMany).not.toHaveBeenCalled();
  });
});
