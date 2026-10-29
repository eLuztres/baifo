/** @jest-environment jsdom */
import { act, fireEvent, render } from '@testing-library/react';
import HidingHeader from '@/components/shared/header/hiding-header';

const scrollTo = (y: number) => {
  Object.defineProperty(window, 'scrollY', { value: y, configurable: true });
  act(() => {
    fireEvent.scroll(window);
  });
};

const renderHeader = (children: React.ReactNode = <button>Places</button>) => {
  const { container } = render(<HidingHeader>{children}</HidingHeader>);
  const header = container.querySelector('header')!;
  Object.defineProperty(header, 'offsetHeight', { value: 64 });
  return header;
};

describe('HidingHeader', () => {
  beforeEach(() => scrollTo(0));

  it('hides while scrolling down and comes back on a small scroll up', () => {
    const header = renderHeader();
    scrollTo(200);
    scrollTo(400);
    expect(header.dataset.hidden).toBe('true');

    scrollTo(385);
    expect(header.dataset.hidden).toBe('false');
  });

  it('ignores a tiny jitter', () => {
    const header = renderHeader();
    scrollTo(400);
    scrollTo(500);
    scrollTo(496);
    expect(header.dataset.hidden).toBe('true');
  });

  it('is always shown at the top of the page', () => {
    const header = renderHeader();
    scrollTo(400);
    scrollTo(500);
    scrollTo(30);
    expect(header.dataset.hidden).toBe('false');
  });

  it('stays while one of its menus is open', () => {
    const header = renderHeader(<button aria-expanded='true'>Menu</button>);
    scrollTo(400);
    scrollTo(600);
    expect(header.dataset.hidden).toBe('false');
  });

  it('comes back when something in it gets the focus', () => {
    const header = renderHeader();
    scrollTo(400);
    scrollTo(600);
    fireEvent.focus(header.querySelector('button')!);
    expect(header.dataset.hidden).toBe('false');
  });
});
