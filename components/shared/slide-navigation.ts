'use client';

import type { useRouter } from 'next/navigation';
import { prefersReducedMotion } from '@/components/shared/home/one-page';

/** `down`: the new page lies below (home → newspaper); `up`: back again. */
export type SlideDirection = 'down' | 'up';

type Router = ReturnType<typeof useRouter>;

// The new page is rendered on the server: the old one stays frozen at most this long while it comes.
const MAX_WAIT_MS = 1500;
const POLL_MS = 30;

/**
 * Goes to `href` with a short vertical slide (View Transitions, CSS in globals.css), so home and the newspaper read as
 * one place above the other. Done once `readySelector` is on the page; elsewhere, or with reduced motion, a plain navigation.
 */
export function slideTo(router: Router, href: string, direction: SlideDirection, readySelector: string) {
  if (!('startViewTransition' in document) || prefersReducedMotion()) return router.push(href);

  const root = document.documentElement;
  root.dataset.slide = direction;
  const transition = document.startViewTransition(
    () =>
      new Promise<void>((resolve) => {
        router.push(href);
        const startedAt = performance.now();
        // A timer, not requestAnimationFrame: the browser draws no frames while a transition waits.
        const waitForPage = () =>
          document.querySelector(readySelector) || performance.now() - startedAt > MAX_WAIT_MS ? resolve() : setTimeout(waitForPage, POLL_MS);
        waitForPage();
      })
  );
  // A skipped slide still lands on the page; it's no error for the visitor.
  transition.ready.catch(() => {});
  transition.finished.catch(() => {}).finally(() => delete root.dataset.slide);
}
