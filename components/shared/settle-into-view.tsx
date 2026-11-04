'use client';

import { useEffect, useRef } from 'react';

// A glide that something stopped lets go after this long, so the page can never stay locked.
const GLIDE_MAX_MS = 900;
// Wheel events closer than this are the same gesture still coasting (a trackpad flick).
const WHEEL_QUIET_MS = 200;
const LANDED_PX = 1;

/** The end of an endless list: the moment this part comes on screen on the way down, the page glides to it and holds it, one screen tall.
    What's left of the gesture is swallowed, so it lands instead of passing through. On the way up it never pulls. */
export default function SettleIntoView({ children }: { children: React.ReactNode }) {
  const partRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let lastY = window.scrollY;
    let isHolding = false;
    let isTouching = false;
    let glideEndsAt = 0;
    let quietTimer: ReturnType<typeof setTimeout> | undefined;

    const topOfPart = () => partRef.current?.getBoundingClientRect().top ?? 0;

    // Holds until the page has landed and the finger or the wheel has let go.
    const letGoWhenStill = () => {
      clearTimeout(quietTimer);
      quietTimer = setTimeout(() => {
        const hasLanded = Math.abs(topOfPart()) <= LANDED_PX;
        const isGlideOver = performance.now() >= glideEndsAt;
        if ((hasLanded || isGlideOver) && !isTouching) {
          isHolding = false;
          lastY = window.scrollY;
        } else letGoWhenStill();
      }, WHEEL_QUIET_MS);
    };
    const land = () => {
      isHolding = true;
      glideEndsAt = performance.now() + GLIDE_MAX_MS;
      const isCalm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: window.scrollY + topOfPart(), behavior: isCalm ? 'auto' : 'smooth' });
      letGoWhenStill();
    };

    const handleScroll = () => {
      const y = window.scrollY;
      const isGoingDown = y > lastY;
      lastY = y;
      if (isHolding || !isGoingDown) return;
      const top = topOfPart();
      if (top > LANDED_PX && top < window.innerHeight) land();
    };
    const swallowWhileHolding = (event: Event) => {
      if (!isHolding) return;
      event.preventDefault();
      letGoWhenStill();
    };
    const handleTouchStart = () => {
      isTouching = true;
    };
    const handleTouchEnd = () => {
      isTouching = false;
      if (isHolding) letGoWhenStill();
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('wheel', swallowWhileHolding, { passive: false });
    window.addEventListener('touchmove', swallowWhileHolding, { passive: false });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('touchcancel', handleTouchEnd);
    return () => {
      clearTimeout(quietTimer);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('wheel', swallowWhileHolding);
      window.removeEventListener('touchmove', swallowWhileHolding);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, []);

  return (
    <div ref={partRef} className='flex min-h-svh flex-col'>
      {children}
    </div>
  );
}
