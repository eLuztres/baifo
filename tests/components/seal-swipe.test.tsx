/** @jest-environment jsdom */
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import SealSwipe from '@/components/shared/home/seal-swipe';

// jsdom has no PointerEvent (fireEvent would drop clientX), no layout and no matchMedia.
class TestPointerEvent extends MouseEvent {
  pointerId = 1;
}
let isReducedMotion = true;
const BUTTON_WIDTH = 300;
const SEAL_WIDTH = 50;
const REACH = BUTTON_WIDTH / 2 - SEAL_WIDTH / 2 - 5;

beforeAll(() => {
  Object.assign(window, { PointerEvent: TestPointerEvent });
  window.matchMedia = ((query: string) => ({ matches: isReducedMotion && query.includes('reduce'), media: query })) as typeof window.matchMedia;
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
    configurable: true,
    get(this: HTMLElement) {
      return this.dataset.testid === 'buttons' ? BUTTON_WIDTH : SEAL_WIDTH;
    },
  });
});

beforeEach(() => {
  jest.useFakeTimers();
  isReducedMotion = true;
  sessionStorage.clear();
});
afterEach(() => jest.useRealTimers());

function renderSplitButton() {
  const onLeft = jest.fn();
  const onRight = jest.fn();
  render(
    <div data-testid='buttons'>
      <button onClick={onLeft}>Selecciones</button>
      <button onClick={onRight}>Anuncios</button>
      <SealSwipe marks={[{ src: '/logo.svg' }]} className='seal' chevronClassName='chevron' />
    </div>
  );
  const seal = screen.getByTestId('buttons').lastElementChild as HTMLElement;
  seal.getBoundingClientRect = () => ({ left: 125, width: SEAL_WIDTH }) as DOMRect;
  return { seal, onLeft, onRight };
}

function swipe(seal: HTMLElement, fromX: number, toX: number) {
  fireEvent.pointerDown(seal, { clientX: fromX, button: 0 });
  fireEvent.pointerMove(seal, { clientX: toX });
  fireEvent.pointerUp(seal, { clientX: toX });
  act(() => jest.runAllTimers());
}

describe('SealSwipe on the start page', () => {
  it('keeps both halves as the real buttons and hides the seal from screen readers', () => {
    const { seal } = renderSplitButton();
    expect(seal).toHaveAttribute('aria-hidden');
    expect(screen.getAllByRole('button')).toHaveLength(2);
  });

  it('a tap on the seal opens the half under the finger', () => {
    const { seal, onLeft, onRight } = renderSplitButton();
    swipe(seal, 135, 136);
    expect(onLeft).toHaveBeenCalledTimes(1);
    swipe(seal, 165, 165);
    expect(onRight).toHaveBeenCalledTimes(1);
  });

  it('a swipe left opens the selections, a swipe right the listings', () => {
    const { seal, onLeft, onRight } = renderSplitButton();
    swipe(seal, 150, 150 - REACH);
    expect(onLeft).toHaveBeenCalledTimes(1);
    swipe(seal, 150, 150 + REACH);
    expect(onRight).toHaveBeenCalledTimes(1);
  });

  it('a short swipe springs back without opening anything', () => {
    const { seal, onLeft, onRight } = renderSplitButton();
    swipe(seal, 150, 150 + REACH * 0.3);
    expect(onLeft).not.toHaveBeenCalled();
    expect(onRight).not.toHaveBeenCalled();
    expect(seal.style.transform).toBe('');
  });

  it('a swipe during the arrival nudge stays where it was dropped', async () => {
    isReducedMotion = false;
    const { seal, onRight } = renderSplitButton();
    await act(async () => jest.advanceTimersByTime(1300));
    fireEvent.pointerDown(seal, { clientX: 150, button: 0 });
    fireEvent.pointerUp(seal, { clientX: 150 + REACH });
    await act(async () => jest.advanceTimersByTime(250));
    expect(seal.style.transform).toBe(`translate(calc(-50% + ${REACH}px), -50%)`);
    await act(async () => jest.runAllTimers());
    expect(onRight).toHaveBeenCalledTimes(1);
  });

  it('opens nothing once the start page is gone', () => {
    const { seal, onRight } = renderSplitButton();
    fireEvent.pointerDown(seal, { clientX: 150, button: 0 });
    fireEvent.pointerUp(seal, { clientX: 150 + REACH });
    cleanup();
    act(() => jest.runAllTimers());
    expect(onRight).not.toHaveBeenCalled();
  });
});
