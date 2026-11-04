'use client';

import { useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useHideOnScroll } from '@/hooks/use-hide-on-scroll';
import { cn } from '@/lib/utils';

interface HidingHeaderProps {
  className?: string;
  children: React.ReactNode;
}

// These pages bring back their own search and filters on a scroll up (StickyFilterRow), so the main bar waits for the top.
const PAGES_WITH_FILTER_ROW = ['/explore'];

/** The sticky header slides up out of view while the visitor scrolls down and comes back on a small scroll up.
    It only moves (no layout change), so the page never jumps. */
export default function HidingHeader({ className, children }: HidingHeaderProps) {
  const headerRef = useRef<HTMLElement>(null);
  const { isHidden, show } = useHideOnScroll(headerRef, undefined, PAGES_WITH_FILTER_ROW.includes(usePathname()));

  return (
    <header
      ref={headerRef}
      onFocus={show}
      data-hidden={isHidden}
      className={cn(className, 'motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-out', isHidden && '-translate-y-full')}
    >
      {children}
    </header>
  );
}
