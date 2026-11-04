/**
 * @jest-environment jsdom
 */
import { act, renderHook } from '@testing-library/react';
import { useHideOnScroll } from '@/hooks/use-hide-on-scroll';

const scrollTo = (y: number) =>
  act(() => {
    Object.defineProperty(window, 'scrollY', { value: y, configurable: true });
    window.dispatchEvent(new Event('scroll'));
  });

const setup = (isOnlyAtTop?: boolean) => {
  const bar = document.createElement('div');
  Object.defineProperty(bar, 'offsetHeight', { value: 60 });
  return renderHook(() => useHideOnScroll({ current: bar }, undefined, isOnlyAtTop));
};

describe('useHideOnScroll', () => {
  beforeEach(() => Object.defineProperty(window, 'scrollY', { value: 0, configurable: true }));

  test('hides on the way down and comes back on a scroll up', () => {
    const { result } = setup();
    scrollTo(500);
    expect(result.current.isHidden).toBe(true);
    scrollTo(450);
    expect(result.current.isHidden).toBe(false);
  });

  test('only at the top: a scroll up leaves it hidden until the top of the page', () => {
    const { result } = setup(true);
    scrollTo(500);
    expect(result.current.isHidden).toBe(true);
    scrollTo(450);
    expect(result.current.isHidden).toBe(true);
    scrollTo(40);
    expect(result.current.isHidden).toBe(false);
  });
});
