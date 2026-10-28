'use client';

import { RefObject } from 'react';
import { useRouter } from 'next/navigation';
import { FEED_COVER_TRANSITION } from './feed-cover';
import styles from './product-ring.module.css';

// The feed is rendered on the server: the old page stays frozen at most this long while it comes.
const MAX_WAIT_MS = 1500;
const POLL_MS = 30;

/**
 * Opens a category's feed from the ring. Where the browser can (View Transitions), the front card grows into the feed's
 * header picture, so ring and feed read as one place; elsewhere, or with reduced motion, it's a plain navigation.
 */
export function useOpenFeed(stageRef: RefObject<HTMLDivElement | null>) {
  const router = useRouter();

  return (href: string) => {
    const cover = stageRef.current?.querySelector<HTMLElement>(`[aria-current] .${styles.glassCard}`);
    const canMorph = cover && 'startViewTransition' in document && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!canMorph) return router.push(href);

    cover.style.viewTransitionName = FEED_COVER_TRANSITION;
    const transition = document.startViewTransition(
      () =>
        new Promise<void>((resolve) => {
          router.push(href);
          const startedAt = performance.now();
          // Done once the feed page is in (data-feed-page), so the new picture is there to morph into. A timer, not
          // requestAnimationFrame: the browser draws no frames while a transition waits, so that never fired.
          const waitForFeed = () =>
            document.querySelector('[data-feed-page]') || performance.now() - startedAt > MAX_WAIT_MS ? resolve() : setTimeout(waitForFeed, POLL_MS);
          waitForFeed();
        })
    );
    // A skipped or aborted morph still lands on the feed; it's no error for the visitor.
    transition.ready.catch(() => {});
    // When the feed took too long the ring is still there: its card must not keep the name.
    transition.finished.catch(() => {}).finally(() => cover.style.removeProperty('view-transition-name'));
  };
}
