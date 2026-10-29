/** @jest-environment jsdom */
import { act, render } from '@testing-library/react';
import SceneCrossfade, { type Scene } from '@/components/shared/home/scene-crossfade';
import { useActiveSection } from '@/components/shared/header/use-active-section';
import type { SectionId } from '@/components/shared/home/one-page';

jest.mock('@/components/shared/header/use-active-section', () => ({ useActiveSection: jest.fn() }));
const mockActiveSection = jest.mocked(useActiveSection);

const SCENES: Scene[] = [
  { tall: '/brand/hero/01-newspaper.webp', wide: '/brand/hero/01-newspaper-wide.webp', figure: '/brand/hero/01-newspaper-figure.webp', alt: 'Newspaper' },
  { tall: '/brand/hero/02-terrace.webp', alt: 'Terrace' },
  { tall: '/brand/hero/03-surf.webp', wide: '/brand/hero/03-surf-wide.webp', alt: 'Surf' },
];

const mockScreen = ({ isReduced = false, isWide = false }) => {
  window.matchMedia = jest.fn((query: string) => ({
    matches: query.includes('reduced-motion') ? isReduced : isWide,
  })) as unknown as typeof window.matchMedia;
};

const shownScene = (container: HTMLElement) => container.querySelector('[data-shown="true"] img')?.getAttribute('alt');

describe('SceneCrossfade', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockActiveSection.mockReturnValue('home');
  });
  afterEach(() => jest.useRealTimers());

  it('starts on the first scene and loads only it and the next one', () => {
    mockScreen({});
    const { container } = render(<SceneCrossfade scenes={SCENES} />);

    expect(shownScene(container)).toBe('Newspaper');
    expect(container.querySelectorAll('picture')).toHaveLength(2);
  });

  it('moves on every 7 seconds and keeps every scene it reached when it wraps around', () => {
    mockScreen({});
    const { container } = render(<SceneCrossfade scenes={SCENES} />);

    act(() => jest.advanceTimersByTime(7000));
    expect(shownScene(container)).toBe('Terrace');

    act(() => jest.advanceTimersByTime(14000));
    expect(shownScene(container)).toBe('Newspaper');
    expect(container.querySelectorAll('picture')).toHaveLength(3);
  });

  it('leaves out the scenes without a wide picture on wide screens', () => {
    mockScreen({ isWide: true });
    const { container } = render(<SceneCrossfade scenes={SCENES} />);

    act(() => jest.advanceTimersByTime(7000));
    expect(shownScene(container)).toBe('Surf');
  });

  it('stays on the first scene with reduced motion and loads no other', () => {
    mockScreen({ isReduced: true });
    const { container } = render(<SceneCrossfade scenes={SCENES} />);

    act(() => jest.advanceTimersByTime(20000));
    expect(shownScene(container)).toBe('Newspaper');
    expect(container.querySelectorAll('picture')).toHaveLength(1);
  });

  it('offers the wide picture on wide screens and hides the scenes not shown from screen readers', () => {
    mockScreen({});
    const { container } = render(<SceneCrossfade scenes={SCENES} />);

    expect(container.querySelector('source')?.getAttribute('srcset')).toContain('01-newspaper-wide.webp');
    expect(container.querySelector('[data-shown="false"] img')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('rests on the first scene away from the top, so scrolling back up lands there and the figure says hello again', () => {
    mockScreen({});
    const { container, rerender } = render(<SceneCrossfade scenes={SCENES} />);
    const figure = () => container.querySelector('[data-arrived]');
    const scrollTo = (section: SectionId) => {
      mockActiveSection.mockReturnValue(section);
      rerender(<SceneCrossfade scenes={SCENES} />);
    };

    act(() => jest.advanceTimersByTime(7000));
    expect(shownScene(container)).toBe('Terrace');

    scrollTo('showroom');
    expect(shownScene(container)).toBe('Newspaper');
    expect(figure()?.getAttribute('data-arrived')).toBe('false');
    act(() => jest.advanceTimersByTime(20000));
    expect(shownScene(container)).toBe('Newspaper');

    scrollTo('home');
    expect(figure()?.getAttribute('data-arrived')).toBe('true');
    act(() => jest.advanceTimersByTime(7000));
    expect(shownScene(container)).toBe('Terrace');
  });

  it('draws the cut-out only over the scene that has one, as decoration', () => {
    mockScreen({});
    const { container } = render(<SceneCrossfade scenes={SCENES} />);
    act(() => jest.advanceTimersByTime(7000));

    const figures = container.querySelectorAll('[data-arrived] img');
    expect(figures).toHaveLength(1);
    expect(figures[0].getAttribute('src')).toContain('01-newspaper-figure.webp');
    expect(figures[0].getAttribute('alt')).toBe('');
  });
});
