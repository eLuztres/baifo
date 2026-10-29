/** @jest-environment jsdom */
import { fireEvent, render } from '@testing-library/react';
import OnePageScroller from '@/components/shared/home/one-page-scroller';

const mockPush = jest.fn();
const mockRouter = { push: mockPush, prefetch: jest.fn(), replace: jest.fn() };
jest.mock('next/navigation', () => ({ useRouter: () => mockRouter }));
jest.mock('@/components/shared/header/use-active-section', () => ({ useActiveSection: () => 'home' }));

// The page scrolls in main's parent; jsdom has no layout, so the scroller sits at the opening part's top.
const renderAtHome = (belowHomeHref?: string) =>
  render(
    <div>
      <main>
        <OnePageScroller belowHomeHref={belowHomeHref} />
        <section id='home'>
          <a href='/explore'>Read the paper</a>
          <button type='button'>Menu</button>
        </section>
        <section id='showroom' />
      </main>
    </div>,
  );

describe('OnePageScroller below the opening part', () => {
  beforeEach(() => {
    mockPush.mockClear();
    document.getAnimations = () => [];
    Element.prototype.scrollBy = jest.fn();
    window.matchMedia = jest.fn().mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia;
    // jsdom has no scroll-margin, which the stops are measured with.
    const { getComputedStyle } = window;
    jest.spyOn(window, 'getComputedStyle').mockImplementation((element) => Object.assign(getComputedStyle(element), { scrollMarginTop: '0px' }));
    // A wheel gesture needs a pause before it; the clock starts near 0.
    jest.spyOn(performance, 'now').mockReturnValue(10_000);
  });
  afterEach(() => jest.restoreAllMocks());

  it('opens belowHomeHref with the wheel instead of turning to the ring', () => {
    const { container } = renderAtHome('/explore');
    fireEvent.wheel(container.firstElementChild!, { deltaY: 100 });

    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith('/explore');
  });

  it('opens it once for a whole wheel gesture', () => {
    const { container } = renderAtHome('/explore');
    for (let i = 0; i < 5; i++) fireEvent.wheel(container.firstElementChild!, { deltaY: 100 });

    expect(mockPush).toHaveBeenCalledTimes(1);
  });

  it('opens it with Page Down from the page or a focused link, but leaves Space on a button alone', () => {
    const { getByRole } = renderAtHome('/explore');
    fireEvent.keyDown(getByRole('button'), { key: ' ' });
    expect(mockPush).not.toHaveBeenCalled();

    fireEvent.keyDown(getByRole('link'), { key: 'PageDown' });
    expect(mockPush).toHaveBeenCalledWith('/explore');
  });

  it('never goes up and away with Shift+Space or wheel up', () => {
    const { container } = renderAtHome('/explore');
    fireEvent.keyDown(document.body, { key: ' ', shiftKey: true });
    fireEvent.wheel(container.firstElementChild!, { deltaY: -100 });

    expect(mockPush).not.toHaveBeenCalled();
  });

  it('turns parts as before without belowHomeHref', () => {
    const { container } = renderAtHome();
    fireEvent.wheel(container.firstElementChild!, { deltaY: 100 });

    expect(mockPush).not.toHaveBeenCalled();
  });
});
