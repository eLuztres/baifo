/** @jest-environment jsdom */
import { act, fireEvent, render } from '@testing-library/react';
import HidingBottomBar from '@/components/shared/hiding-bottom-bar';

const scrollTo = (y: number) => {
  Object.defineProperty(window, 'scrollY', { value: y, configurable: true });
  act(() => {
    fireEvent.scroll(window);
  });
};

const renderBar = (formBottom: number) => {
  const { container } = render(
    <form>
      <HidingBottomBar>
        <button>Save</button>
      </HidingBottomBar>
    </form>
  );
  const form = container.querySelector('form')!;
  form.getBoundingClientRect = () => ({ bottom: formBottom }) as DOMRect;
  return container.querySelector<HTMLElement>('[data-hidden]')!;
};

describe('HidingBottomBar', () => {
  beforeEach(() => scrollTo(0));

  it('slides away while scrolling down and comes back on a small scroll up', () => {
    const bar = renderBar(5000);
    scrollTo(300);
    expect(bar.dataset.hidden).toBe('true');
    scrollTo(280);
    expect(bar.dataset.hidden).toBe('false');
  });

  it('stays once the end of its form is on screen', () => {
    const bar = renderBar(window.innerHeight - 10);
    scrollTo(300);
    expect(bar.dataset.hidden).toBe('false');
  });

  it('ignores a small jitter and comes back when its button gets focus', () => {
    const bar = renderBar(5000);
    scrollTo(300);
    scrollTo(295);
    expect(bar.dataset.hidden).toBe('true');
    fireEvent.focus(bar.querySelector('button')!);
    expect(bar.dataset.hidden).toBe('false');
  });
});
