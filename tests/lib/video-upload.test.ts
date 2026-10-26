import { uploadVideos } from '@/lib/video-upload';
import { videoPoster } from '@/lib/video';

jest.mock('@/lib/video', () => ({
  ...jest.requireActual('@/lib/video'),
  videoStill: jest.fn(async (file: File) => (file.name.startsWith('broken') ? null : new File(['jpg'], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }))),
}));

const uploaded = (files: File[]) => Promise.resolve(files.map((file) => ({ name: file.name, type: file.type, ufsUrl: `https://x.ufs.sh/f/${file.name}` })));

describe('uploadVideos', () => {
  it('marks each video with its uploaded still frame', async () => {
    const [url] = await uploadVideos([new File(['v'], 'clip.mov', { type: 'video/quicktime' })], uploaded, uploaded);

    expect(url.startsWith('https://x.ufs.sh/f/clip.mov#video=')).toBe(true);
    expect(videoPoster(url)).toBe('https://x.ufs.sh/f/clip.jpg');
  });

  it('keeps a video whose still could not be taken, without one', async () => {
    const [url] = await uploadVideos([new File(['v'], 'broken.mov', { type: 'video/quicktime' })], uploaded, uploaded);

    expect(url).toBe('https://x.ufs.sh/f/broken.mov#video');
  });
});
