/** @jest-environment jsdom */
import { coverPicture, isVideoUrl, mediaUrl, pictureOf, videoPoster, videoSource, videoStill } from '@/lib/video';

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

describe('video stills in the URL', () => {
  const video = mediaUrl('https://x.ufs.sh/f/clip', 'video/quicktime', 'https://x.ufs.sh/f/still');

  it('carries the still frame in the video mark', () => {
    expect(isVideoUrl(video)).toBe(true);
    expect(videoPoster(video)).toBe('https://x.ufs.sh/f/still');
    expect(videoSource(video)).toBe('https://x.ufs.sh/f/clip');
  });

  it('gives a picture for places that only show pictures', () => {
    expect(pictureOf(video)).toBe('https://x.ufs.sh/f/still');
    expect(pictureOf('https://x.ufs.sh/f/photo')).toBe('https://x.ufs.sh/f/photo');
    expect(pictureOf(mediaUrl('https://x.ufs.sh/f/old', 'video/mp4'))).toBeUndefined();
  });

  it('takes a first video\'s still as the cover, and skips a video without one', () => {
    expect(coverPicture([video, 'https://x.ufs.sh/f/photo'])).toBe('https://x.ufs.sh/f/still');
    expect(coverPicture([mediaUrl('https://x.ufs.sh/f/old', 'video/mp4'), 'https://x.ufs.sh/f/photo'])).toBe('https://x.ufs.sh/f/photo');
    expect(coverPicture([])).toBeUndefined();
  });
});
