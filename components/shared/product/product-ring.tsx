'use client';

import { CSSProperties } from 'react';
import { cn } from '@/lib/utils';
import styles from './product-ring.module.css';

// 60 is the fewest at which the panels no longer show as stripes.
const BAND_SEGMENTS = 60;
const FACE_WIDTH = (2 * Math.PI) / BAND_SEGMENTS;
const LIGHT_ANGLE_DEG = -35;

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

// The band stands still so the light stays put like on real metal; only its engraving turns (GoldEngraving).
const BAND_FACES = Array.from({ length: BAND_SEGMENTS }, (_, index) => {
  const angle = (index * 360) / BAND_SEGMENTS;
  const facing = Math.cos(toRadians(angle));
  const towardLight = Math.max(Math.cos(toRadians(angle - LIGHT_ANGLE_DEG)), 0);
  return {
    '--i': index,
    '--angle': `${angle}deg`,
    // Darkens smoothly toward the sides; the inside is lit most where it faces the viewer, at the back.
    '--shade': (0.55 * (1 - Math.max(facing, 0)) ** 1.3).toFixed(3),
    '--inner-shade': (0.12 + 0.38 * (1 - Math.max(-facing, 0))).toFixed(3),
    // A soft, wide shine instead of a few washed-out faces.
    '--highlight': (0.28 * towardLight ** 12).toFixed(3),
  } as CSSProperties;
});

interface GoldBandProps {
  className: string;
}

export const GoldBand = ({ className }: GoldBandProps) => (
  <div className={cn(styles.band, className)} style={{ '--face-w': FACE_WIDTH } as CSSProperties} aria-hidden='true'>
    {BAND_FACES.map((style, index) => (
      <div key={index} className={styles.bandSegment} style={style}>
        <span className={styles.bandOuter} />
        <span className={styles.bandInner} />
        <span className={cn(styles.bandEdge, styles.bandTop)} />
        <span className={cn(styles.bandEdge, styles.bandBottom)} />
      </div>
    ))}
  </div>
);

/** The band's vine alone, on the same faces: laid over the still GoldBand, it turns with the cards. */
export const GoldEngraving = ({ className }: GoldBandProps) => (
  <div className={cn(styles.band, className)} style={{ '--face-w': FACE_WIDTH } as CSSProperties} aria-hidden='true'>
    {BAND_FACES.map((style, index) => (
      <div key={index} className={styles.bandSegment} style={style}>
        <span className={styles.engravingFace} />
        <span className={cn(styles.engravingFace, styles.engravingInner)} />
      </div>
    ))}
  </div>
);
