/** @jest-environment jsdom */
import { playFullScreen } from '@/lib/video-full-screen';

const makeVideo = () => {
  const video = document.createElement('video');
  video.muted = true;
  video.play = jest.fn().mockResolvedValue(undefined);
  return video;
};

const setFullScreenElement = (element: Element | null) =>
  Object.defineProperty(document, 'fullscreenElement', { value: element, configurable: true });

describe('playFullScreen', () => {
  afterEach(() => setFullScreenElement(null));

  it('plays the same video full screen with sound, and muted again once back on the page', async () => {
    const video = makeVideo();
    video.requestFullscreen = jest.fn().mockResolvedValue(undefined);

    expect(playFullScreen(video)).toBe(true);
    expect(video.requestFullscreen).toHaveBeenCalled();
    expect(video.muted).toBe(false);
    expect(video.play).toHaveBeenCalled();

    setFullScreenElement(video);
    document.dispatchEvent(new Event('fullscreenchange'));
    expect(video.muted).toBe(false);

    setFullScreenElement(null);
    document.dispatchEvent(new Event('fullscreenchange'));
    expect(video.muted).toBe(true);
  });

  it('uses the iPhone full screen when that is all there is', () => {
    const video = makeVideo();
    Object.defineProperty(video, 'requestFullscreen', { value: undefined });
    const webkitEnterFullscreen = jest.fn();
    Object.assign(video, { webkitEnterFullscreen });

    expect(playFullScreen(video)).toBe(true);
    expect(webkitEnterFullscreen).toHaveBeenCalled();
    expect(video.muted).toBe(false);

    video.dispatchEvent(new Event('webkitendfullscreen'));
    expect(video.muted).toBe(true);
  });

  it('returns false where the browser cannot show a video full screen', () => {
    const video = makeVideo();
    Object.defineProperty(video, 'requestFullscreen', { value: undefined });

    expect(playFullScreen(video)).toBe(false);
    expect(video.muted).toBe(true);
  });
});
