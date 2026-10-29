'use client';

import { useCallback, useRef } from 'react';
import { useHideOnScroll } from '@/hooks/use-hide-on-scroll';
import { cn } from '@/lib/utils';

interface HidingBottomBarProps {
  className?: string;
  children: React.ReactNode;
}

/** A floating bar at the bottom (`sticky bottom-…` in className) that slides down out of view while the visitor scrolls
    down, like the header. It must be the last thing in its form: at the form's end it always shows, so its button is never missing. */
export default function HidingBottomBar({ className, children }: HidingBottomBarProps) {
  const barRef = useRef<HTMLDivElement>(null);
  // The bar is the last thing in its form: once the form's end is on screen, the bar sits in its own place.
  const isInPlace = useCallback(() => (barRef.current?.parentElement?.getBoundingClientRect().bottom ?? Infinity) <= window.innerHeight, []);
  const { isHidden, show } = useHideOnScroll(barRef, isInPlace);

  return (
    <div
      ref={barRef}
      onFocus={show}
      data-hidden={isHidden}
      className={cn(className, 'motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-out', isHidden && 'translate-y-[calc(100%+2rem)]')}
    >
      {children}
    </div>
  );
}
