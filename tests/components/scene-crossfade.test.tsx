/** @jest-environment jsdom */
import { act, render } from '@testing-library/react';
import SceneCrossfade, { type Scene } from '@/components/shared/home/scene-crossfade';

const SCENES: Scene[] = [
  { tall: '/brand/hero/01-newspaper.webp', wide: '/brand/hero/01-newspaper-wide.webp', alt: 'Newspaper' },
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
  beforeEach(() => jest.useFakeTimers());
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
});
