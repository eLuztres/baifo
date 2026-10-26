'use client';

import { RefObject, useEffect, useState } from 'react';

export interface NeighbourSpot {
  /** -1 for the card left of the front one, 1 for the card right of it. */
  offset: -1 | 1;
  x: number;
  y: number;
}

const OFFSETS = [-1, 1] as const;
// How close an arrow's middle may come to the stage's edge: on a phone the neighbour cards' middles lie off screen.
const EDGE_PX = 30;

/**
 * Where the cards left and right of the front one show on screen, shortly after a turn starts (empty right after it),
 * kept inside the stage and given relative to its parent, where the arrows sit outside the stage's faded edges.
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
      const parentBox = (stage.parentElement ?? stage).getBoundingClientRect();
      const slots = stage.querySelectorAll('li');
      setSpots(
        OFFSETS.map((offset) => {
          const box = slots[(frontIndex + offset + count) % count].getBoundingClientRect();
          const middle = Math.min(Math.max(box.left + box.width / 2, stageBox.left + EDGE_PX), stageBox.right - EDGE_PX);
          return { offset, x: middle - parentBox.left, y: box.top + box.height / 2 - parentBox.top };
        })
      );
    };
    setSpots([]);
    // The cards are nearly in place before the turn ends: the arrows show then and glide the last bit
    // when measured again at the end. Observing starts after that, since its first call comes at once.
    const observer = new ResizeObserver(measure);
    const earlyTimer = setTimeout(measure, appearMs);
    // Measured here too: the observer's first call alone sometimes came too early and left an arrow mid-turn.
    const settleTimer = setTimeout(() => {
      measure();
      observer.observe(stage);
    }, settleMs);
    return () => {
      clearTimeout(earlyTimer);
      clearTimeout(settleTimer);
      observer.disconnect();
    };
  }, [stageRef, frontIndex, count, appearMs, settleMs]);

  return spots;
}
