'use client';

import { type RefObject, useEffect, useState } from 'react';

// Scrolling this far in one direction hides or shows the bar, so a jittery finger doesn't make it flicker.
const DIRECTION_PX = 8;

/** Hidden while the visitor scrolls the window down, shown again on a small scroll up and always at the top of the page.
    A bar stays while one of its menus is open or it has keyboard focus, and while `isInPlace` says it's where it belongs. */
export function useHideOnScroll(barRef: RefObject<HTMLElement | null>, isInPlace?: () => boolean) {
  const [isHidden, setIsHidden] = useState(false);

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    let lastY = window.scrollY;
    let travel = 0;

    // Pages whose layout scrolls instead of the window (the one-page home) never send these, so their bar stays.
    const handleScroll = () => {
      const y = window.scrollY;
      const delta = y - lastY;
      lastY = y;
      // A mouse click leaves the focus on a button too; only keyboard focus (focus-visible) holds the bar.
      const isInUse = !!bar.querySelector('[aria-expanded="true"], :focus-visible');
      if (y <= bar.offsetHeight || isInUse || isInPlace?.()) {
        travel = 0;
        return setIsHidden(false);
      }
      travel = Math.sign(delta) === Math.sign(travel) ? travel + delta : delta;
      if (travel > DIRECTION_PX) setIsHidden(true);
      else if (travel < -DIRECTION_PX) setIsHidden(false);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [barRef, isInPlace]);

  return { isHidden, show: () => setIsHidden(false) };
}
