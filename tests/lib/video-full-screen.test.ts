/** @jest-environment jsdom */
import { playFullScreen, playWithSound } from '@/lib/video-full-screen';

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

  it('plays the same video full screen with sound, and keeps playing with sound once back on the page', () => {
    const video = makeVideo();
    video.requestFullscreen = jest.fn().mockResolvedValue(undefined);

    playFullScreen(video);
    expect(video.requestFullscreen).toHaveBeenCalled();
    expect(video.muted).toBe(false);
    expect(video.play).toHaveBeenCalledTimes(1);

    setFullScreenElement(video);
    document.dispatchEvent(new Event('fullscreenchange'));
    setFullScreenElement(null);
    document.dispatchEvent(new Event('fullscreenchange'));
    expect(video.muted).toBe(false);
    expect(video.play).toHaveBeenCalledTimes(2);
  });

  it('keeps the sound on when full screen is refused', async () => {
    const video = makeVideo();
    video.requestFullscreen = jest.fn().mockRejectedValue(new TypeError('not allowed'));

    playFullScreen(video);
    await new Promise(process.nextTick);

    expect(video.muted).toBe(false);
  });

  it('works on old browsers where full screen and play return nothing', () => {
    const video = makeVideo();
    video.play = jest.fn().mockReturnValue(undefined);
    video.requestFullscreen = jest.fn().mockReturnValue(undefined);

    expect(() => playFullScreen(video)).not.toThrow();
    expect(video.muted).toBe(false);
  });

  it('uses the iPhone full screen when that is all there is', () => {
    const video = makeVideo();
    Object.defineProperty(video, 'requestFullscreen', { value: undefined });
    const webkitEnterFullscreen = jest.fn();
    Object.assign(video, { webkitEnterFullscreen });

    playFullScreen(video);
    expect(webkitEnterFullscreen).toHaveBeenCalled();
    expect(video.muted).toBe(false);

    video.dispatchEvent(new Event('webkitendfullscreen'));
    expect(video.muted).toBe(false);
  });

  it('keeps the sound on when the iPhone full screen throws because the video has not loaded', () => {
    const video = makeVideo();
    Object.defineProperty(video, 'requestFullscreen', { value: undefined });
    Object.assign(video, {
      webkitEnterFullscreen: () => {
        throw new DOMException('not loaded', 'InvalidStateError');
      },
    });

    expect(() => playFullScreen(video)).not.toThrow();
    expect(video.muted).toBe(false);
  });

  it('plays with sound on the page where there is no full screen at all', () => {
    const video = makeVideo();
    Object.defineProperty(video, 'requestFullscreen', { value: undefined });

    playFullScreen(video);
    expect(video.muted).toBe(false);
    expect(video.play).toHaveBeenCalled();
  });
});

describe('playWithSound', () => {
  it('falls back to muted when the browser refuses sound before a tap', async () => {
    const video = makeVideo();
    video.play = jest.fn().mockRejectedValueOnce(Object.assign(new Error('blocked'), { name: 'NotAllowedError' })).mockResolvedValue(undefined);

    playWithSound(video);
    await new Promise(process.nextTick);

    expect(video.muted).toBe(true);
    expect(video.play).toHaveBeenCalledTimes(2);
  });

  it('leaves it alone when playing was only interrupted', async () => {
    const video = makeVideo();
    video.play = jest.fn().mockRejectedValue(Object.assign(new Error('paused'), { name: 'AbortError' }));

    playWithSound(video);
    await new Promise(process.nextTick);

    expect(video.muted).toBe(false);
    expect(video.play).toHaveBeenCalledTimes(1);
  });
});
