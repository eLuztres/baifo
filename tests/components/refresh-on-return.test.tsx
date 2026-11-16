/**
 * @jest-environment jsdom
 */
import { act, render } from '@testing-library/react';
import RefreshOnReturn, { AWAY_MS, findAnchor, holdAnchor, HOLD_MS, isTypingPage, restoreAnchor } from '@/components/shared/refresh-on-return';

const mockRefresh = jest.fn();
let mockPathname = '/';
jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh: mockRefresh }), usePathname: () => mockPathname }));

let visibility: DocumentVisibilityState = 'visible';
Object.defineProperty(document, 'visibilityState', { get: () => visibility });

const mockReload = jest.fn();
Object.defineProperty(window, 'location', { value: { ...window.location, reload: mockReload }, writable: true });

const serverVersion = (version: string) => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ version }) }) as jest.Mock;
};

async function goAway(ms: number) {
  visibility = 'hidden';
  document.dispatchEvent(new Event('visibilitychange'));
  jest.advanceTimersByTime(ms);
  visibility = 'visible';
  await act(async () => {
    document.dispatchEvent(new Event('visibilitychange'));
  });
}

beforeEach(() => {
  jest.useFakeTimers();
  mockRefresh.mockClear();
  mockReload.mockClear();
  mockPathname = '/';
  serverVersion('deploy-1');
  window.location.search = '';
  document.body.innerHTML = '';
});
afterEach(() => jest.useRealTimers());

describe('RefreshOnReturn', () => {
  it('fetches what is new when the app comes back after a while', async () => {
    render(<RefreshOnReturn version='deploy-1' />);

    await goAway(AWAY_MS);

    expect(mockRefresh).toHaveBeenCalledTimes(1);
    expect(mockReload).not.toHaveBeenCalled();
  });

  it('leaves the page alone after a short look at another app', async () => {
    render(<RefreshOnReturn version='deploy-1' />);

    await goAway(AWAY_MS - 1000);

    expect(mockRefresh).not.toHaveBeenCalled();
    expect(mockReload).not.toHaveBeenCalled();
  });

  it('reloads with the new code when a new deploy is live, even after a short time away', async () => {
    serverVersion('deploy-2');
    render(<RefreshOnReturn version='deploy-1' />);

    await goAway(1000);

    expect(mockReload).toHaveBeenCalledTimes(1);
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it('never reloads while someone may be typing a listing', async () => {
    serverVersion('deploy-2');
    mockPathname = '/publicar/abc';
    render(<RefreshOnReturn version='deploy-1' />);

    await goAway(AWAY_MS);

    expect(mockReload).not.toHaveBeenCalled();
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it('only refreshes the data when offline', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('offline')) as jest.Mock;
    render(<RefreshOnReturn version='deploy-1' />);

    await goAway(AWAY_MS);

    expect(mockReload).not.toHaveBeenCalled();
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it('skips the check without a version (local dev)', async () => {
    render(<RefreshOnReturn />);

    await goAway(AWAY_MS);

    expect(global.fetch).not.toHaveBeenCalled();
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it('does not reload while a pop-up is open, only refreshes the data', async () => {
    serverVersion('deploy-2');
    render(<RefreshOnReturn version='deploy-1' />);
    document.body.insertAdjacentHTML('beforeend', '<div role="dialog"></div>');

    await goAway(AWAY_MS);

    expect(mockReload).not.toHaveBeenCalled();
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it('does not reload while a field holds typed text', async () => {
    serverVersion('deploy-2');
    render(<RefreshOnReturn version='deploy-1' />);
    document.body.insertAdjacentHTML('beforeend', '<textarea>Hola, ¿sigue disponible?</textarea>');

    await goAway(1000);

    expect(mockReload).not.toHaveBeenCalled();
  });

  it('still reloads a search: its text is in the address and comes back', async () => {
    serverVersion('deploy-2');
    window.location.search = '?q=tabla';
    render(<RefreshOnReturn version='deploy-1' />);
    document.body.insertAdjacentHTML('beforeend', '<input type="search" value="tabla">');

    await goAway(1000);

    expect(mockReload).toHaveBeenCalledTimes(1);
  });

  it('checks once when a restored page fires both events', async () => {
    render(<RefreshOnReturn version='deploy-1' />);

    await act(async () => {
      window.dispatchEvent(Object.assign(new Event('pageshow'), { persisted: true }));
      visibility = 'hidden';
      document.dispatchEvent(new Event('visibilitychange'));
      visibility = 'visible';
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('does nothing when the page is gone before the check answers', async () => {
    let answer: (value: unknown) => void = () => {};
    global.fetch = jest.fn(() => new Promise((resolve) => (answer = resolve))) as jest.Mock;
    const { unmount } = render(<RefreshOnReturn version='deploy-1' />);

    await goAway(AWAY_MS);
    unmount();
    await act(async () => answer({ ok: true, json: async () => ({ version: 'deploy-2' }) }));

    expect(mockReload).not.toHaveBeenCalled();
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it('stops listening once the page is gone', async () => {
    const { unmount } = render(<RefreshOnReturn version='deploy-1' />);
    unmount();

    await goAway(AWAY_MS);

    expect(mockRefresh).not.toHaveBeenCalled();
    expect(mockReload).not.toHaveBeenCalled();
  });
});

describe('isTypingPage', () => {
  it('knows the pages with a form', () => {
    expect(isTypingPage('/publicar/abc')).toBe(true);
    expect(isTypingPage('/contact')).toBe(true);
    expect(isTypingPage('/order/123')).toBe(true);
    expect(isTypingPage('/explore')).toBe(false);
    expect(isTypingPage('/contactos')).toBe(false);
  });
});

describe('keeping the card on screen in place', () => {
  const card = (id: string, top: number) => {
    const element = document.createElement('li');
    element.dataset.anchor = id;
    element.getBoundingClientRect = () => ({ top, bottom: top + 300 }) as DOMRect;
    document.body.appendChild(element);
    return element;
  };
  const moveTo = (element: HTMLElement, top: number) => (element.getBoundingClientRect = () => ({ top, bottom: top + 300 }) as DOMRect);
  const scrolledTo = (y: number) => Object.defineProperty(window, 'scrollY', { configurable: true, value: y });
  // MutationObserver answers in a microtask.
  const pageChanges = async () => {
    document.body.appendChild(document.createElement('div'));
    await act(async () => {});
  };

  beforeEach(() => {
    window.scrollBy = jest.fn();
  });

  it('remembers the first card on screen and scrolls it back after new listings pushed it down', () => {
    scrolledTo(900);
    card('above', -400);
    const looked = card('looked-at', 120);
    const anchor = findAnchor()!;
    expect(anchor).toEqual({ id: 'looked-at', top: 120 });

    moveTo(looked, 470);
    restoreAnchor(anchor);

    expect(window.scrollBy).toHaveBeenCalledWith(0, 350);
  });

  it('keeps nothing at the very top: the new listings simply come first', () => {
    scrolledTo(0);
    card('first', 80);

    expect(findAnchor()).toBeNull();
  });

  it('leaves the page alone when the card is gone or did not move', () => {
    scrolledTo(900);
    const sold = card('sold', 100);
    const anchor = findAnchor()!;
    restoreAnchor(anchor);
    sold.remove();
    restoreAnchor(anchor);

    expect(window.scrollBy).not.toHaveBeenCalled();
  });

  it('follows each change of the page while the new listings come in, then lets go', async () => {
    scrolledTo(900);
    const looked = card('looked-at', 120);
    holdAnchor(findAnchor()!);

    moveTo(looked, 400);
    await pageChanges();
    expect(window.scrollBy).toHaveBeenLastCalledWith(0, 280);

    jest.advanceTimersByTime(HOLD_MS);
    moveTo(looked, 700);
    await pageChanges();
    expect(window.scrollBy).toHaveBeenCalledTimes(1);
  });

  it('never pulls the page back once the person scrolls', async () => {
    scrolledTo(900);
    const looked = card('looked-at', 120);
    holdAnchor(findAnchor()!);

    window.dispatchEvent(new Event('touchstart'));
    moveTo(looked, 400);
    await pageChanges();

    expect(window.scrollBy).not.toHaveBeenCalled();
  });

  it('holds the view when the app comes back scrolled down', async () => {
    scrolledTo(900);
    const looked = card('looked-at', 120);
    render(<RefreshOnReturn version='deploy-1' />);

    await goAway(AWAY_MS);
    expect(mockRefresh).toHaveBeenCalledTimes(1);
    expect(document.cookie).toContain('quiet-refresh=1');
    moveTo(looked, 420);
    await pageChanges();

    expect(window.scrollBy).toHaveBeenCalledWith(0, 300);
  });
});
