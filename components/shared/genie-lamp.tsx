import type { CSSProperties } from 'react';
import type { Point } from '@/lib/brand';
import { cn } from '@/lib/utils';
import LampSmoke from './lamp-smoke';
import styles from './gold-leaf-background.module.css';

interface Sparkle {
  left: number;
  top: number;
  size: number;
  delay: number;
}

// Four-pointed stars around the lamp, as in the logo. Fixed values so server and client match.
const SPARKLES: Sparkle[] = [
  { left: 12, top: 18, size: 27, delay: 0 },
  { left: 84, top: 12, size: 39, delay: -1.6 },
  { left: 27, top: 9, size: 18, delay: -3.1 },
  { left: 92, top: 38, size: 21, delay: -0.8 },
  { left: 6, top: 52, size: 33, delay: -2.4 },
  { left: 70, top: 28, size: 15, delay: -4 },
  { left: 18, top: 74, size: 18, delay: -1.2 },
  { left: 88, top: 70, size: 24, delay: -3.6 },
];

const SPARKLE_PATH = 'M0 -10 L1.6 -1.6 L10 0 L1.6 1.6 L0 10 L-1.6 1.6 L-10 0 L-1.6 -1.6 Z';

// Each star twinkles inside a plain box: browsers reliably fade a box on the compositor, an svg not always.
export function GoldSparkles() {
  return SPARKLES.map((sparkle, index) => (
    <span
      key={index}
      className={styles.sparkle}
      style={
        {
          left: `${sparkle.left}%`,
          top: `${sparkle.top}%`,
          width: sparkle.size,
          animationDelay: `${sparkle.delay}s`,
        } as CSSProperties
      }
    >
      <svg viewBox='-10 -10 20 20'>
        <path d={SPARKLE_PATH} fill='currentColor' />
      </svg>
    </span>
  ));
}

interface GenieLampProps {
  className?: string;
  /** A picture to show instead of the drawn lamp (BRAND_LAMP_IMAGE); its bottom edge is the lamp's foot. */
  image?: string;
  /** The spout in that picture, where the smoke starts. */
  spout?: Point;
}

// The magic lamp from the logo in the opening scene, drawn as a single gold line (or BRAND_LAMP_IMAGE).
export default function GenieLamp({ className, image, spout }: GenieLampProps) {
  if (image) {
    return (
      <div className={cn(styles.lamp, styles.lampPicture, className)} aria-hidden='true'>
        <LampSmoke spout={spout} />
        {/* eslint-disable-next-line @next/next/no-img-element -- a decoration at a size set by CSS; next/image adds nothing here */}
        <img src={image} alt='' className={styles.lampDrawing} />
      </div>
    );
  }

  return (
    <div className={cn(styles.lamp, className)} aria-hidden='true'>
      <LampSmoke />
        <svg viewBox='0 0 640 340' className={styles.lampDrawing} fill='none' stroke='currentColor' strokeLinecap='round' strokeLinejoin='round'>
        {/* Lid with its flame-shaped knob */}
        <path d='M300 96 C292 84 298 72 310 58 C322 72 328 84 320 96' />
        <path d='M296 98 H324' />
        <path d='M258 156 C258 118 286 100 310 100 C334 100 362 118 362 156' />
        <path d='M272 132 H348 M266 144 H354' />
        <path d='M290 104 C286 120 286 140 288 156 M330 104 C334 120 334 140 332 156' />

        {/* Body and spout */}
        <path d='M168 160 C176 214 236 244 310 244 C376 244 430 222 456 188 C500 172 548 150 590 126 L584 118 C546 134 504 148 462 156 L168 160 Z' />
        <path d='M186 174 C238 190 384 190 446 172' />
        <path d='M196 186 C206 204 222 196 230 186 C238 176 254 180 252 194 M368 194 C366 180 382 176 390 186 C398 196 414 204 424 186' />
        <path d='M310 240 C292 220 292 204 310 188 C328 204 328 220 310 240 Z' />
        <path d='M280 236 C274 220 280 206 292 200 M340 236 C346 220 340 206 328 200' />

        {/* Handle scroll */}
        <path d='M168 160 C128 142 92 160 100 194 C106 220 140 226 154 208 C166 192 152 176 138 182 C126 188 130 204 142 202' />
        <path d='M172 172 C150 168 128 178 128 196' />

        {/* Foot */}
        <path d='M288 244 C292 262 282 276 266 286 M332 244 C328 262 338 276 354 286' />
        <path d='M298 252 C300 266 296 276 290 284 M322 252 C320 266 324 276 330 284' />
        <ellipse cx='310' cy='292' rx='60' ry='10' />
        <path d='M254 300 C276 308 344 308 366 300' />
      </svg>
    </div>
  );
}
