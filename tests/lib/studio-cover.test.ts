import { UTApi } from 'uploadthing/server';
import { generateCategoryCover } from '@/lib/actions/studio.actions';

jest.mock('@/lib/auth-guard', () => ({ isAdmin: jest.fn().mockResolvedValue(true) }));
jest.mock('@/db/prisma', () => ({ prisma: { category: { findMany: jest.fn().mockResolvedValue([]) } } }));
jest.mock('@/lib/ai-usage', () => ({ generateImage: jest.fn().mockResolvedValue(new Uint8Array([1])) }));
jest.mock('@/lib/i18n-server', () => ({ getT: jest.fn().mockResolvedValue({ t: (key: string) => key }) }));
jest.mock('uploadthing/server', () => ({ UTApi: jest.fn(), UTFile: jest.fn() }));
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));
jest.mock('@/lib/studio/prompts.mjs', () => ({ categoryCoverPrompt: (text: string) => text }));

const mockUploadFiles = jest.fn();
(UTApi as unknown as jest.Mock).mockImplementation(() => ({ uploadFiles: mockUploadFiles }));

describe('generateCategoryCover', () => {
  it('returns the cover URL once UploadThing has it', async () => {
    mockUploadFiles.mockResolvedValue([{ data: { ufsUrl: 'https://x.ufs.sh/f/cover.jpg' } }]);
    await expect(generateCategoryCover('Perros y gatos', 'Mascotas')).resolves.toEqual({
      success: true,
      message: '',
      url: 'https://x.ufs.sh/f/cover.jpg',
    });
  });

  // A blocked network makes the upload reject (fetch ETIMEDOUT) instead of answering with an error.
  it('gives the friendly upload message when UploadThing cannot be reached', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mockUploadFiles.mockRejectedValue(new TypeError('fetch failed'));
    await expect(generateCategoryCover('Perros y gatos', 'Mascotas')).resolves.toEqual({
      success: false,
      message: 'STUDIO_UPLOAD_FAILED',
    });
  });

  it('gives the same message when UploadThing answers with an error', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mockUploadFiles.mockResolvedValue([{ data: null, error: { code: 'UPLOAD_FAILED' } }]);
    await expect(generateCategoryCover('Perros y gatos', 'Mascotas')).resolves.toEqual({
      success: false,
      message: 'STUDIO_UPLOAD_FAILED',
    });
  });
});
