'use client';

import { useEffect } from 'react';
import { isClearlySideways, isInDialog, isInsideSideMover, scrollToSection } from '@/components/shared/home/one-page';
import type { NavLink } from './nav-items';
import { useActiveNavIndex } from './use-active-section';

interface TabSwipeProps {
  links: NavLink[];
}

const MIN_SWIPE_PX = 70;
const MAX_SWIPE_MS = 700;
const PHONE_QUERY = '(max-width: 1023px)';

/** Phones: on the one-page home, swiping left or right glides to the next or previous part. */
export default function TabSwipe({ links }: TabSwipeProps) {
  const activeIndex = useActiveNavIndex(links);

  useEffect(() => {
    if (activeIndex === -1) return;
    let start: { x: number; y: number; time: number } | null = null;

    const handleStart = (event: TouchEvent) => {
      const isSingleTouch = event.touches.length === 1;
      // An open menu or dialog keeps its own swipes; the page behind it must not move.
      const isDialogOpen = document.body.hasAttribute('data-scroll-locked') || isInDialog(event.target);
      start = isSingleTouch && !isDialogOpen && window.matchMedia(PHONE_QUERY).matches && !isInsideSideMover(event.target)
        ? { x: event.touches[0].clientX, y: event.touches[0].clientY, time: Date.now() }
        : null;
    };

    const handleEnd = (event: TouchEvent) => {
      if (!start) return;
      const deltaX = event.changedTouches[0].clientX - start.x;
      const deltaY = event.changedTouches[0].clientY - start.y;
      const isSwipe = Math.abs(deltaX) > MIN_SWIPE_PX && isClearlySideways(deltaX, deltaY) && Date.now() - start.time < MAX_SWIPE_MS;
      start = null;
      if (!isSwipe) return;

      const target = links[activeIndex + (deltaX < 0 ? 1 : -1)];
      if (target) scrollToSection(target.section);
    };

    document.addEventListener('touchstart', handleStart, { passive: true });
    document.addEventListener('touchend', handleEnd, { passive: true });
    return () => {
      document.removeEventListener('touchstart', handleStart);
      document.removeEventListener('touchend', handleEnd);
    };
  }, [activeIndex, links]);

  return null;
}
