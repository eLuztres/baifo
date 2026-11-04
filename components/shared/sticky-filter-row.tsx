'use client';

import { useCallback, useRef } from 'react';
import { useHideOnScroll } from '@/hooks/use-hide-on-scroll';
import { cn } from '@/lib/utils';

interface StickyFilterRowProps {
  className?: string;
  children: React.ReactNode;
}

/** A page's search and filters: they leave with the page on a scroll down and come back at the top of the screen on a small scroll up.
    It must be the first thing in its page. */
export default function StickyFilterRow({ className, children }: StickyFilterRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  // While the page's start is on screen the row sits in its own place, under the main bar.
  const isInPlace = useCallback(() => (rowRef.current?.parentElement?.getBoundingClientRect().top ?? 0) > 0, []);
  const { isHidden, show } = useHideOnScroll(rowRef, isInPlace);

  return (
    <div
      ref={rowRef}
      onFocus={show}
      data-hidden={isHidden}
      className={cn(
        className,
        // The background reaches the screen's edges, whatever the page's width, while the cards pass under it.
        "sticky top-0 z-30 py-2 before:absolute before:inset-y-0 before:left-1/2 before:-z-10 before:w-screen before:-translate-x-1/2 before:bg-background before:content-[''] motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-out",
        isHidden && '-translate-y-full'
      )}
    >
      {children}
    </div>
  );
}
