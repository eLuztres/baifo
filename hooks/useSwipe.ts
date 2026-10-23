'use client';

import { TouchEvent, useRef } from 'react';
import { isClearlySideways } from '@/components/shared/home/one-page';

const MIN_SWIPE_PX = 40;

interface SwipeOptions {
  /** -1 for a swipe to the right (back), 1 for a swipe to the left (forward). */
  onSwipe: (direction: -1 | 1) => void;
}

/** Sideways touch swipes on an element; up-and-down swipes are left to the page's scrolling. */
export function useSwipe({ onSwipe }: SwipeOptions) {
  const start = useRef<{ x: number; y: number } | null>(null);
  const hasSwiped = useRef(false);

  const onTouchStart = (event: TouchEvent) => {
    const touch = event.touches[0];
    start.current = event.touches.length === 1 ? { x: touch.clientX, y: touch.clientY } : null;
    hasSwiped.current = false;
  };

  const onTouchEnd = (event: TouchEvent) => {
    if (!start.current) return;
    const deltaX = event.changedTouches[0].clientX - start.current.x;
    const deltaY = event.changedTouches[0].clientY - start.current.y;
    start.current = null;
    if (Math.abs(deltaX) < MIN_SWIPE_PX || !isClearlySideways(deltaX, deltaY)) return;
    hasSwiped.current = true;
    onSwipe(deltaX < 0 ? 1 : -1);
  };

  return {
    handlers: { onTouchStart, onTouchEnd },
    /** True right after a swipe, so the tap handler of the same element can ignore it. */
    hasSwiped: () => hasSwiped.current,
  };
}
