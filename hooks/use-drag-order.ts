'use client';

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type MouseEvent, type PointerEvent } from 'react';

// A touch must rest this long before it drags; a quicker swipe scrolls the row as usual.
const HOLD_MS = 300;
const MOVE_SLOP = 6;
const EDGE = 40;
const EDGE_SCROLL = 8;

interface Drag {
  from: number;
  to: number;
  dx: number;
  dy: number;
  /** Where each item started, so the others can slide into the free places. */
  lefts: number[];
}

interface Gesture {
  pointerId: number;
  index: number;
  startX: number;
  startY: number;
  startScroll: number;
  lefts: number[];
  centers: number[];
  isActive: boolean;
  to: number;
  timer?: number;
}

/**
 * Reorder a horizontal row by dragging its items: mouse drags at once, touch after a short hold,
 * arrow keys move the focused item. `onMove` decides and says whether it moved; a refused move springs back.
 */
export function useDragOrder(onMove: (from: number, to: number) => boolean) {
  const listRef = useRef<HTMLUListElement>(null);
  const items = useRef<(HTMLElement | null)[]>([]);
  const handles = useRef<(HTMLElement | null)[]>([]);
  const gesture = useRef<Gesture | null>(null);
  const wasDragged = useRef(false);
  const focusAfterMove = useRef<number | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);

  // Once a hold started a drag, the finger moves the photo and must not scroll the row.
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const stopScroll = (event: TouchEvent) => gesture.current?.isActive && event.preventDefault();
    list.addEventListener('touchmove', stopScroll, { passive: false });
    return () => list.removeEventListener('touchmove', stopScroll);
  }, []);

  // Moved items are new elements (their key has the place), so focus follows by hand.
  useEffect(() => {
    if (focusAfterMove.current === null) return;
    handles.current[focusAfterMove.current]?.focus();
    focusAfterMove.current = null;
  });

  const begin = (current: Gesture) => {
    current.isActive = true;
    wasDragged.current = true;
    setDrag({ from: current.index, to: current.index, dx: 0, dy: 0, lefts: current.lefts });
  };

  const stop = () => {
    window.clearTimeout(gesture.current?.timer);
    gesture.current = null;
    setDrag(null);
  };

  const onPointerDown = (index: number) => (event: PointerEvent<HTMLElement>) => {
    const list = listRef.current;
    if (event.button !== 0 || !list) return;
    const rects = items.current.map((item) => item?.getBoundingClientRect());
    const current: Gesture = {
      pointerId: event.pointerId,
      index,
      startX: event.clientX,
      startY: event.clientY,
      startScroll: list.scrollLeft,
      lefts: rects.map((rect) => rect?.left ?? 0),
      centers: rects.map((rect) => (rect ? rect.left + rect.width / 2 : 0)),
      isActive: false,
      to: index,
    };
    wasDragged.current = false;
    gesture.current = current;
    if (event.pointerType === 'touch') current.timer = window.setTimeout(() => begin(current), HOLD_MS);
    else event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    const current = gesture.current;
    const list = listRef.current;
    if (!current || current.pointerId !== event.pointerId || !list) return;
    const dx = event.clientX - current.startX;
    const dy = event.clientY - current.startY;
    if (!current.isActive) {
      if (Math.hypot(dx, dy) < MOVE_SLOP) return;
      // A touch that moves before the hold is a scroll.
      if (event.pointerType === 'touch') return stop();
      begin(current);
    }
    const box = list.getBoundingClientRect();
    if (event.clientX < box.left + EDGE) list.scrollLeft -= EDGE_SCROLL;
    else if (event.clientX > box.right - EDGE) list.scrollLeft += EDGE_SCROLL;
    const scrolled = list.scrollLeft - current.startScroll;
    const pointerX = event.clientX + scrolled;
    current.to = current.centers.filter((center, index) => index !== current.index && center < pointerX).length;
    setDrag({ from: current.index, to: current.to, dx: dx + scrolled, dy, lefts: current.lefts });
  };

  const onPointerUp = (event: PointerEvent<HTMLElement>) => {
    const current = gesture.current;
    if (!current || current.pointerId !== event.pointerId) return;
    stop();
    if (current.isActive && current.to !== current.index) onMove(current.index, current.to);
  };

  // After a drag the release is no tap: the photo doesn't open.
  const onClickCapture = (event: MouseEvent<HTMLElement>) => {
    if (!wasDragged.current) return;
    wasDragged.current = false;
    event.preventDefault();
    event.stopPropagation();
  };

  const onKeyDown = (index: number) => (event: KeyboardEvent<HTMLElement>) => {
    const step = { ArrowLeft: -1, ArrowRight: 1 }[event.key];
    if (!step) return;
    event.preventDefault();
    if (onMove(index, index + step)) focusAfterMove.current = index + step;
  };

  const itemStyle = (index: number): CSSProperties | undefined => {
    if (!drag) return undefined;
    if (index === drag.from) return { transform: `translate(${drag.dx}px, ${drag.dy}px) scale(1.05)`, zIndex: 10, transition: 'none' };
    const { from, to, lefts } = drag;
    const neighbor = from < to && index > from && index <= to ? index - 1 : to < from && index >= to && index < from ? index + 1 : index;
    return neighbor === index ? undefined : { transform: `translateX(${lefts[neighbor] - lefts[index]}px)` };
  };

  return {
    listRef,
    isDragging: drag !== null,
    draggedIndex: drag?.from ?? null,
    itemProps: (index: number) => ({
      ref: (element: HTMLElement | null) => {
        items.current[index] = element;
      },
      style: itemStyle(index),
    }),
    handleProps: (index: number) => ({
      ref: (element: HTMLElement | null) => {
        handles.current[index] = element;
      },
      onPointerDown: onPointerDown(index),
      onPointerMove,
      onPointerUp,
      onPointerCancel: stop,
      onClickCapture,
      onKeyDown: onKeyDown(index),
      // No image menu on a long press, and no native image drag with the mouse.
      onContextMenu: (event: MouseEvent<HTMLElement>) => event.preventDefault(),
      onDragStart: (event: MouseEvent<HTMLElement>) => event.preventDefault(),
    }),
  };
}
