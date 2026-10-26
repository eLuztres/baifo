/** @jest-environment jsdom */
import { isVideoUrl, mediaUrl, videoStill } from '@/lib/video';

describe('videoStill', () => {
  beforeAll(() => {
    URL.createObjectURL = jest.fn(() => 'blob:video');
    URL.revokeObjectURL = jest.fn();
  });

  // Like iOS Safari with a video that isn't on the page: the video never fires its events.
  it('gives up after a few seconds instead of hanging the upload', async () => {
    jest.useFakeTimers();
    jest.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => undefined);
    const still = videoStill(new File(['x'], 'clip.mov', { type: 'video/quicktime' }));

    jest.advanceTimersByTime(8000);

    await expect(still).resolves.toBeNull();
    jest.useRealTimers();
  });
});

describe('mediaUrl', () => {
  it('marks videos so they are told apart from photos', () => {
    expect(isVideoUrl(mediaUrl('https://x.ufs.sh/f/abc', 'video/quicktime'))).toBe(true);
    expect(isVideoUrl(mediaUrl('https://x.ufs.sh/f/abc', 'image/jpeg'))).toBe(false);
  });
});
