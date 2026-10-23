'use client';

import { CSSProperties, PointerEvent, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import styles from './ring-space.module.css';

export interface SpaceRing {
  slug: string;
  name: string;
  price?: string;
  image: string;
}

interface RingSpaceFieldProps {
  rings: SpaceRing[];
}

export interface Slot {
  x: number;
  y: number;
  depth: number;
  size: number;
}

// Hand-placed around the title: x/y in % of the scene, depth in px (negative = far away), size in vmin.
// Four rings near the corners at different depths, so the title keeps the middle and the field stays calm.
const SLOTS: Slot[] = [
  { x: 16, y: 26, depth: -60, size: 14 },
  { x: 84, y: 72, depth: -180, size: 11 },
  { x: 86, y: 20, depth: -320, size: 9 },
  { x: 12, y: 76, depth: -260, size: 10 },
];

const FARTHEST = 700;
const MAX_SHIFT_PX = 46;
const BLUR_PER_PX = 1 / 260;

function slotStyle(slot: Slot, index: number) {
  // 0 = far away, 1 = right in front of the viewer.
  const nearness = (slot.depth + FARTHEST) / (FARTHEST + 150);
  return {
    '--x': `${slot.x}%`,
    '--y': `${slot.y}%`,
    '--depth': `${slot.depth}px`,
    '--size': `${slot.size}vmin`,
    '--shift': `${nearness * MAX_SHIFT_PX}px`,
    '--blur': `${Math.max(0, -slot.depth) * BLUR_PER_PX}px`,
    '--dim': 0.45 + 0.55 * nearness,
    '--drift-s': `${11 + (index % 5) * 2.3}s`,
    '--delay-s': `${index * -1.7}s`,
    // Neighbours turn in opposite directions, so the field never moves like one sheet.
    '--turn': index % 2 === 0 ? '26deg' : '-26deg',
  } as CSSProperties;
}

const RingSpaceField = ({ rings }: RingSpaceFieldProps) => {
  const fieldRef = useRef<HTMLDivElement>(null);

  // Near rings follow the pointer more than far ones, which reads as depth.
  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const field = fieldRef.current;
    if (!field || event.pointerType !== 'mouse') return;
    const box = field.getBoundingClientRect();
    field.style.setProperty('--px', `${((event.clientX - box.left) / box.width) * 2 - 1}`);
    field.style.setProperty('--py', `${((event.clientY - box.top) / box.height) * 2 - 1}`);
  };

  return (
    <div ref={fieldRef} className={styles.field} onPointerMove={handlePointerMove}>
      {rings.slice(0, SLOTS.length).map((ring, index) => (
        <Link
          key={ring.slug}
          href={`/product/${ring.slug}`}
          className={styles.ring}
          style={slotStyle(SLOTS[index], index)}
        >
          {/* No alt: the label below names the link, so the name isn't read twice. */}
          <span className={styles.body}>
            <Image src={ring.image} alt='' fill unoptimized sizes='26vmin' />
          </span>
          <span className={styles.label}>
            {ring.name}
            {ring.price && <span className={styles.labelPrice}>{ring.price}</span>}
          </span>
        </Link>
      ))}
    </div>
  );
};

export default RingSpaceField;
