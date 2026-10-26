'use client';

import { Dispatch, DragEvent, MouseEvent, PointerEvent, SetStateAction, useRef } from 'react';
import { isClearlyVertical, SIDE_MOVER_LOCK_PX } from '@/components/shared/home/one-page';

// A sideways swipe at least this long turns the ring by one card.
const SWIPE_PX = 24;

type DragAxis = 'x' | 'y' | null;

interface RingDragOptions {
  setStep: Dispatch<SetStateAction<number>>;
}

/**
 * A sideways swipe (or mouse drag) turns the ring by one card once it ends, with the same soft turn as the arrows;
 * up and down does nothing. The ring doesn't follow the finger: that moved the cards jerkily before the turn.
 */
export function useRingDrag({ setStep }: RingDragOptions) {
  const dragRef = useRef({ startX: 0, startY: 0, deltaX: 0, axis: null as DragAxis, isDown: false });

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    dragRef.current = { startX: event.clientX, startY: event.clientY, deltaX: 0, axis: null, isDown: true };
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag.isDown) return;

    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    if (!drag.axis) {
      if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < SIDE_MOVER_LOCK_PX) return;
      drag.axis = isClearlyVertical(deltaX, deltaY) ? 'y' : 'x';
      // Keeps the swipe ours when the finger leaves the ring.
      if (drag.axis === 'x') event.currentTarget.setPointerCapture(event.pointerId);
    }
    drag.deltaX = deltaX;
  };

  const onPointerUp = () => {
    const drag = dragRef.current;
    drag.isDown = false;
    if (drag.axis !== 'x' || Math.abs(drag.deltaX) < SWIPE_PX) return;
    // Swiping left brings the next card to the front.
    setStep((current) => current - Math.sign(drag.deltaX));
  };

  // An interrupted swipe turns nothing.
  const onPointerCancel = () => {
    dragRef.current.isDown = false;
  };

  // A swipe that ends on a card must not open it, whichever way it went: the stage takes every touch, so none scrolls.
  const onClickCapture = (event: MouseEvent<HTMLDivElement>) => {
    if (dragRef.current.axis) event.preventDefault();
  };

  // The browser's own image drag would cancel the pointer gesture as soon as it starts on a card photo.
  const onDragStart = (event: DragEvent<HTMLDivElement>) => event.preventDefault();

  return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onClickCapture, onDragStart };
}
