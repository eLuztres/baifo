'use client';

import { RefObject, useEffect, useState } from 'react';

export interface NeighbourSpot {
  /** -1 for the card left of the front one, 1 for the card right of it. */
  offset: -1 | 1;
  x: number;
  y: number;
}

const OFFSETS = [-1, 1] as const;

/**
 * Where the cards left and right of the front one show on screen, shortly after a turn starts (empty right after it).
 * Measured instead of drawn inside the 3D cards: Chrome sometimes paints a card's photo over anything placed on it.
 */
export function useNeighbourSpots(
  stageRef: RefObject<HTMLDivElement | null>,
  frontIndex: number,
  count: number,
  appearMs: number,
  settleMs: number
) {
  const [spots, setSpots] = useState<NeighbourSpot[]>([]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const measure = () => {
      const stageBox = stage.getBoundingClientRect();
      const slots = stage.querySelectorAll('li');
      setSpots(
        OFFSETS.map((offset) => {
          const box = slots[(frontIndex + offset + count) % count].getBoundingClientRect();
          return { offset, x: box.left + box.width / 2 - stageBox.left, y: box.top + box.height / 2 - stageBox.top };
        })
      );
    };
    setSpots([]);
    // The cards are nearly in place before the turn ends: the arrows show then and glide the last bit
    // when measured again at the end. Observing starts after that, since its first call comes at once.
    const observer = new ResizeObserver(measure);
    const earlyTimer = setTimeout(measure, appearMs);
    const settleTimer = setTimeout(() => observer.observe(stage), settleMs);
    return () => {
      clearTimeout(earlyTimer);
      clearTimeout(settleTimer);
      observer.disconnect();
    };
  }, [stageRef, frontIndex, count, appearMs, settleMs]);

  return spots;
}
