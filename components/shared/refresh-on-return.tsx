'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { QUIET_REFRESH_COOKIE, QUIET_REFRESH_SECONDS } from '@/lib/quiet-refresh';

/** Away at least this long (another app, the phone locked), the page fetches what's new when it shows again;
    shorter is only a glance at another app. */
export const AWAY_MS = 10_000;

export const VERSION_PATH = '/api/version';

interface RefreshOnReturnProps {
  /** The deploy this page was loaded from; empty (local dev) skips the check. */
  version?: string;
}

// Pages with a form or a payment: a reload there could lose what the person typed or interrupt paying.
const TYPING_PATHS = ['/publicar', '/contact', '/shipping-address', '/payment-method', '/place-order', '/order'];

export const isTypingPage = (pathname: string) => TYPING_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));

const TEXT_FIELDS = 'textarea, input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=submit]):not([type=button])';

/** An open pop-up or a field with typed text: the person is in the middle of something. Text that is in the address
    (a search) comes back after the reload. */
export function hasWorkInProgress() {
  if (document.querySelector('[role="dialog"], [role="alertdialog"]')) return true;
  const inAddress = new Set(new URLSearchParams(window.location.search).values());
  return Array.from(document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(TEXT_FIELDS)).some(
    (field) => field.value.trim() !== '' && !inAddress.has(field.value)
  );
}

/** True only when the server answers with another deploy; offline or an error counts as "no". */
export async function isNewVersion(version: string) {
  try {
    const response = await fetch(VERSION_PATH, { cache: 'no-store' });
    if (!response.ok) return false;
    const { version: current } = (await response.json()) as { version?: string };
    return Boolean(current) && current !== version;
  } catch {
    return false;
  }
}

// Things on the page that exist once: a listing in the list, a Mercadillo's row.
const ANCHOR = '[data-anchor]';
// How long the view follows the anchor while the new listings come in; any touch or scroll ends it sooner.
export const HOLD_MS = 4000;
const USER_INPUT = ['touchstart', 'wheel', 'keydown', 'pointerdown'] as const;

interface Anchor {
  id: string;
  top: number;
}

/** The first thing on screen and where it is, so new listings above it can't push it away. At the very top: none,
    the new ones simply show up first. */
export function findAnchor(): Anchor | null {
  if (window.scrollY <= 0) return null;
  const element = Array.from(document.querySelectorAll<HTMLElement>(ANCHOR)).find((candidate) => {
    const { top, bottom } = candidate.getBoundingClientRect();
    return bottom > 0 && top < window.innerHeight;
  });
  return element?.dataset.anchor ? { id: element.dataset.anchor, top: element.getBoundingClientRect().top } : null;
}

/** Scrolls so the anchor is back where it was; gone (sold, taken down): the page stays as it is. */
export function restoreAnchor({ id, top }: Anchor) {
  const element = Array.from(document.querySelectorAll<HTMLElement>(ANCHOR)).find((candidate) => candidate.dataset.anchor === id);
  const shift = element ? element.getBoundingClientRect().top - top : 0;
  if (shift !== 0) window.scrollBy(0, shift);
}

/** Keeps the anchor in place each time the page changes, for a few seconds; returns how to stop early. */
export function holdAnchor(anchor: Anchor) {
  const observer = new MutationObserver(() => restoreAnchor(anchor));
  const stop = () => {
    observer.disconnect();
    clearTimeout(timer);
    USER_INPUT.forEach((type) => window.removeEventListener(type, stop));
  };
  const timer = setTimeout(stop, HOLD_MS);
  observer.observe(document.body, { childList: true, subtree: true });
  // The person scrolls on their own: never pull the page back against them.
  USER_INPUT.forEach((type) => window.addEventListener(type, stop, { passive: true }));
  return stop;
}

/**
 * A site added to the home screen is kept alive in the background and comes back as it was: old listings and old code
 * until it was closed. Back after a new deploy it reloads, unless the person is in the middle of something; otherwise
 * it only fetches the server's data again, keeping anything typed and the card on screen where it was.
 */
export default function RefreshOnReturn({ version }: RefreshOnReturnProps) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let hiddenAt: number | null = null;
    let isChecking = false;
    let isGone = false;
    let stopHolding = () => {};
    const canReload = () => Boolean(version) && !isTypingPage(pathname) && !hasWorkInProgress();
    const onReturn = async (wasAwayLong: boolean) => {
      // A page restored from the back/forward cache fires two events: one check is enough.
      if (isChecking) return;
      isChecking = true;
      const shouldReload = canReload() && (await isNewVersion(version!));
      isChecking = false;
      // The person may have moved on, or started typing, while the check was on its way.
      if (isGone) return;
      if (shouldReload && canReload()) {
        window.location.reload();
        return;
      }
      if (!wasAwayLong) return;
      const anchor = findAnchor();
      stopHolding();
      if (anchor) stopHolding = holdAnchor(anchor);
      document.cookie = `${QUIET_REFRESH_COOKIE}=1; max-age=${QUIET_REFRESH_SECONDS}; path=/; samesite=lax`;
      router.refresh();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now();
        return;
      }
      if (hiddenAt !== null) onReturn(Date.now() - hiddenAt >= AWAY_MS);
      hiddenAt = null;
    };
    // A page the browser restored from its back/forward cache is just as old.
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) onReturn(true);
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pageshow', onPageShow);
    return () => {
      isGone = true;
      stopHolding();
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, [router, pathname, version]);

  return null;
}
