'use client';

import { useEffect, useRef } from 'react';

// Stopping once the part has come this far up the screen brings it the rest of the way.
const SETTLE_SCREEN_SHARE = 0.75;
// Scroll events this far apart mean the scrolling has stopped (Safari has no scrollend before 26).
const SCROLL_END_MS = 150;

/** On the way down, stopping with this part well on screen brings it to the top of the screen, so it reads as its own page.
    On the way up it never pulls, so the visitor can always go back to what's above. */
export default function SettleIntoView({ children }: { children: React.ReactNode }) {
  const partRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let lastY = window.scrollY;
    let isGoingDown = false;
    let isTouching = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const settle = () => {
      const top = partRef.current?.getBoundingClientRect().top ?? 0;
      // A finger still on the screen is holding the page where it wants it.
      if (isTouching || !isGoingDown || top <= 0 || top >= window.innerHeight * SETTLE_SCREEN_SHARE) return;
      const isCalm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: window.scrollY + top, behavior: isCalm ? 'auto' : 'smooth' });
    };
    const handleScroll = () => {
      isGoingDown = window.scrollY > lastY;
      lastY = window.scrollY;
      clearTimeout(timer);
      timer = setTimeout(settle, SCROLL_END_MS);
    };
    const handleTouchStart = () => {
      isTouching = true;
    };
    const handleTouchEnd = () => {
      isTouching = false;
      clearTimeout(timer);
      timer = setTimeout(settle, SCROLL_END_MS);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('touchcancel', handleTouchEnd);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, []);

  return <div ref={partRef}>{children}</div>;
}
