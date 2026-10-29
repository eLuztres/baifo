/** @jest-environment jsdom */
import { slideTo } from '@/components/shared/slide-navigation';

const router = { push: jest.fn() } as unknown as Parameters<typeof slideTo>[0];

const mockReducedMotion = (isReduced: boolean) => {
  window.matchMedia = jest.fn(() => ({ matches: isReduced })) as unknown as typeof window.matchMedia;
};

describe('slideTo', () => {
  afterEach(() => {
    jest.clearAllMocks();
    delete (document as Partial<Document>).startViewTransition;
    delete document.documentElement.dataset.slide;
  });

  it('is a plain navigation without View Transitions', () => {
    mockReducedMotion(false);
    slideTo(router, '/explore', 'down', '[data-feed-page]');
    expect(router.push).toHaveBeenCalledWith('/explore');
    expect(document.documentElement.dataset.slide).toBeUndefined();
  });

  it('is a plain navigation with reduced motion', () => {
    mockReducedMotion(true);
    const startViewTransition = jest.fn();
    Object.assign(document, { startViewTransition });
    slideTo(router, '/explore', 'down', '[data-feed-page]');

    expect(startViewTransition).not.toHaveBeenCalled();
    expect(router.push).toHaveBeenCalledWith('/explore');
  });

  it('slides in the given direction until the new page is there, then lets go', async () => {
    mockReducedMotion(false);
    let finish = () => {};
    let update: Promise<void> | undefined;
    Object.assign(document, {
      startViewTransition: (callback: () => Promise<void>) => {
        update = callback();
        return { ready: Promise.resolve(), finished: new Promise<void>((resolve) => (finish = resolve)) };
      },
    });
    document.body.innerHTML = '<div data-feed-page></div>';

    slideTo(router, '/explore', 'up', '[data-feed-page]');
    expect(document.documentElement.dataset.slide).toBe('up');
    await update;
    expect(router.push).toHaveBeenCalledWith('/explore');

    finish();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(document.documentElement.dataset.slide).toBeUndefined();
  });
  it('lets go after a while when the new page never shows up', async () => {
    jest.useFakeTimers();
    mockReducedMotion(false);
    let isDone = false;
    Object.assign(document, {
      startViewTransition: (callback: () => Promise<void>) => {
        callback().then(() => (isDone = true));
        return { ready: Promise.resolve(), finished: new Promise<void>(() => {}) };
      },
    });
    document.body.innerHTML = '';

    slideTo(router, '/', 'up', '#home');
    await jest.advanceTimersByTimeAsync(1000);
    expect(isDone).toBe(false);
    await jest.advanceTimersByTimeAsync(600);
    expect(isDone).toBe(true);
    jest.useRealTimers();
  });
});
