'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

// Scrolling this far in one direction hides or shows the bar, so a jittery finger doesn't make it flicker.
const DIRECTION_PX = 8;

interface HidingHeaderProps {
  className?: string;
  children: React.ReactNode;
}

/** The sticky header slides up out of view while the visitor scrolls down and comes back on a small scroll up.
    It only moves (no layout change), stays at the top of the page, while one of its menus is open or while it has focus. */
export default function HidingHeader({ className, children }: HidingHeaderProps) {
  const headerRef = useRef<HTMLElement>(null);
  const [isHidden, setIsHidden] = useState(false);

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    let lastY = window.scrollY;
    let travel = 0;

    // Pages whose layout scrolls instead of the window (the one-page home) never send these, so their bar stays.
    const handleScroll = () => {
      const y = window.scrollY;
      const delta = y - lastY;
      lastY = y;
      // A mouse click leaves the focus on a button too; only keyboard focus (focus-visible) holds the bar.
      const isInUse = !!header.querySelector('[aria-expanded="true"], :focus-visible');
      if (y <= header.offsetHeight || isInUse) {
        travel = 0;
        return setIsHidden(false);
      }
      travel = Math.sign(delta) === Math.sign(travel) ? travel + delta : delta;
      if (travel > DIRECTION_PX) setIsHidden(true);
      else if (travel < -DIRECTION_PX) setIsHidden(false);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      ref={headerRef}
      onFocus={() => setIsHidden(false)}
      data-hidden={isHidden}
      className={cn(className, 'motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-out', isHidden && '-translate-y-full')}
    >
      {children}
    </header>
  );
}
