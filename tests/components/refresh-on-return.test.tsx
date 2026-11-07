/**
 * @jest-environment jsdom
 */
import { render } from '@testing-library/react';
import RefreshOnReturn, { AWAY_MS } from '@/components/shared/refresh-on-return';

const mockRefresh = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh: mockRefresh }) }));

let visibility: DocumentVisibilityState = 'visible';
Object.defineProperty(document, 'visibilityState', { get: () => visibility });

function goAway(ms: number) {
  visibility = 'hidden';
  document.dispatchEvent(new Event('visibilitychange'));
  jest.advanceTimersByTime(ms);
  visibility = 'visible';
  document.dispatchEvent(new Event('visibilitychange'));
}

beforeEach(() => {
  jest.useFakeTimers();
  mockRefresh.mockClear();
});
afterEach(() => jest.useRealTimers());

describe('RefreshOnReturn', () => {
  it('fetches what is new when the app comes back after a while', () => {
    render(<RefreshOnReturn />);

    goAway(AWAY_MS);

    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it('leaves the page alone after a short look at another app', () => {
    render(<RefreshOnReturn />);

    goAway(AWAY_MS - 1000);

    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it('stops listening once the page is gone', () => {
    const { unmount } = render(<RefreshOnReturn />);
    unmount();

    goAway(AWAY_MS);

    expect(mockRefresh).not.toHaveBeenCalled();
  });
});
