'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createWheelGestureGate, isClearlyVertical, isInDialog } from '@/components/shared/home/one-page';

// Finger travel upward before the swipe counts as "next ring".
const SWIPE_PX = 50;

interface NextRingSwipeProps {
  href: string;
}

/** A long description scrolls inside its card; until its end, an upward swipe there reads it instead of turning on. */
const isReadingAbove = (target: EventTarget | null) => {
  for (let element = target instanceof Element ? target : null; element; element = element.parentElement) {
    const { overflowY } = getComputedStyle(element);
    const canScroll = (overflowY === 'auto' || overflowY === 'scroll') && element.scrollHeight > element.clientHeight;
    if (canScroll) return element.scrollTop + element.clientHeight < element.scrollHeight - 1;
  }
  return false;
};

/** The product page is one screen: swiping up (or the wheel down) turns on to the next ring of the store. */
export default function NextRingSwipe({ href }: NextRingSwipeProps) {
  const router = useRouter();

  useEffect(() => {
    router.prefetch(href);
    let isLeaving = false;
    let start: { x: number; y: number; isBlocked: boolean } | null = null;
    const isNewWheelGesture = createWheelGestureGate();

    const goNext = () => {
      if (isLeaving) return;
      isLeaving = true;
      router.push(href);
    };

    const handleTouchStart = (event: TouchEvent) => {
      const touch = event.touches[0];
      const isBlocked = event.touches.length > 1 || isInDialog(event.target) || isReadingAbove(event.target);
      start = { x: touch.clientX, y: touch.clientY, isBlocked };
    };

    const handleTouchEnd = (event: TouchEvent) => {
      const touch = event.changedTouches[0];
      if (!start || start.isBlocked) return;
      const deltaX = touch.clientX - start.x;
      const deltaY = touch.clientY - start.y;
      start = null;
      if (deltaY < -SWIPE_PX && isClearlyVertical(deltaX, deltaY)) goNext();
    };

    const handleWheel = (event: WheelEvent) => {
      const isNewGesture = isNewWheelGesture();
      if (!isNewGesture || event.ctrlKey || event.deltaY <= 0 || !isClearlyVertical(event.deltaX, event.deltaY)) return;
      if (isInDialog(event.target) || isReadingAbove(event.target)) return;
      goNext();
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('wheel', handleWheel, { passive: true });
    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('wheel', handleWheel);
    };
  }, [href, router]);

  return null;
}
