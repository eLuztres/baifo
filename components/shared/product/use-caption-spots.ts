'use client';

import { RefObject, useEffect, useRef, useState } from 'react';

export interface CaptionSpot {
  /** -1 for the arrow left of the front card's name, 1 for the one right of it. */
  offset: -1 | 1;
  x: number;
  y: number;
}

const OFFSETS = [-1, 1] as const;
// From an arrow's middle to the name: half the arrow (2.5rem, .turnHint) and a little air.
const NAME_GAP_PX = 28;
// How close an arrow's middle may come to the stage's edge, so a long name never pushes it off screen.
const EDGE_PX = 24;

/**
 * Where the arrows on both sides of the front card's name show, given relative to the stage's parent, where the
 * arrows sit outside the stage's faded edges. Measured only once the ring has settled: mid-turn the name is still
 * on its way, and arrows following it jumped up and down. During a turn they stay where they were, and their height
 * is kept until the stage changes size, since the front card floats a little even at rest.
 * Measured instead of drawn inside the 3D cards: Chrome sometimes paints a card's photo over anything placed on it.
 */
export function useCaptionSpots(stageRef: RefObject<HTMLDivElement | null>, frontIndex: number, settleMs: number) {
  const [spots, setSpots] = useState<CaptionSpot[]>([]);
  const height = useRef<{ y: number; stageSize: string } | null>(null);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const measure = () => {
      const stageBox = stage.getBoundingClientRect();
      const parentBox = (stage.parentElement ?? stage).getBoundingClientRect();
      const name = stage.querySelectorAll('li')[frontIndex]?.querySelector('p > span');
      if (!name) return;
      const box = name.getBoundingClientRect();
      const stageSize = `${Math.round(stageBox.width)}x${Math.round(stageBox.height)}`;
      if (height.current?.stageSize !== stageSize) height.current = { y: box.top + box.height / 2 - parentBox.top, stageSize };
      const { y } = height.current;
      setSpots(
        OFFSETS.map((offset) => {
          const side = offset === -1 ? box.left - NAME_GAP_PX : box.right + NAME_GAP_PX;
          const x = Math.min(Math.max(side, stageBox.left + EDGE_PX), stageBox.right - EDGE_PX);
          return { offset, x: x - parentBox.left, y };
        })
      );
    };
    // Observing starts after the turn, since its first call comes at once.
    const observer = new ResizeObserver(measure);
    // Measured here too: the observer's first call alone sometimes came too early and left an arrow mid-turn.
    const settleTimer = setTimeout(() => {
      measure();
      observer.observe(stage);
    }, settleMs);
    return () => {
      clearTimeout(settleTimer);
      observer.disconnect();
    };
  }, [stageRef, frontIndex, settleMs]);

  return spots;
}
