/** @jest-environment jsdom */
import { act, fireEvent, render } from '@testing-library/react';
import PullUpHome from '@/components/shared/pull-up-home';

const mockPush = jest.fn();
// One router for every render, like Next's.
const mockRouter = { push: mockPush, prefetch: jest.fn() };
jest.mock('next/navigation', () => ({ useRouter: () => mockRouter }));

const scrollTo = (y: number) => Object.defineProperty(window, 'scrollY', { value: y, configurable: true });
const wheelUp = (times: number) => {
  for (let i = 0; i < times; i++) {
    fireEvent.wheel(window, { deltaY: -100 });
    act(() => jest.advanceTimersByTime(50));
  }
};

describe('PullUpHome', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockPush.mockClear();
    scrollTo(0);
    // The fake clock starts at 0, where the first wheel event would still count as part of an earlier gesture.
    jest.advanceTimersByTime(1000);
  });
  afterEach(() => jest.useRealTimers());

  it('goes home after a long enough wheel pull that starts at the top, and fills the hint on the way', () => {
    const { getByRole } = render(<PullUpHome href='/' label='Back home' />);

    wheelUp(1);
    expect(getByRole('link', { name: 'Back home' }).style.getPropertyValue('--pull')).not.toBe('0');
    expect(mockPush).not.toHaveBeenCalled();

    wheelUp(2);
    expect(mockPush).toHaveBeenCalledWith('/');
  });

  it('ignores the end of reading upward: the gesture started below the top', () => {
    render(<PullUpHome href='/' label='Back home' />);
    scrollTo(300);
    fireEvent.wheel(window, { deltaY: -100 });
    scrollTo(0);
    wheelUp(5);

    expect(mockPush).not.toHaveBeenCalled();
  });

  it('lets a short pull go again', () => {
    const { getByRole } = render(<PullUpHome href='/' label='Back home' />);
    wheelUp(1);
    act(() => jest.advanceTimersByTime(1000));

    expect(getByRole('link').style.getPropertyValue('--pull')).toBe('0');
    wheelUp(1);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('goes home with Page Up or Home at the top only', () => {
    render(<PullUpHome href='/' label='Back home' />);
    scrollTo(200);
    fireEvent.keyDown(document.body, { key: 'Home' });
    expect(mockPush).not.toHaveBeenCalled();

    scrollTo(0);
    fireEvent.keyDown(document.body, { key: 'PageUp' });
    expect(mockPush).toHaveBeenCalledWith('/');
  });
});
