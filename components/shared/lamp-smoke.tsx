'use client';

import { useEffect, useRef } from 'react';
import { ON_SCREEN_MARGIN, prefersReducedMotion } from '@/components/shared/home/one-page';
import type { Point } from '@/lib/brand';
import styles from './gold-leaf-background.module.css';

interface Puff {
  x: number;
  y: number;
  age: number;
  life: number;
  seed: number;
  rise: number;
}

// Spout tip as shares of the lamp drawing's viewBox (0 0 640 340).
const DRAWN_LAMP_SPOUT: Point = { x: 590 / 640, y: 124 / 340 };
// Half as many puffs, each a little denser, look the same and halve the drawing on phones.
const PUFFS_PER_SECOND = 10;
const PUFF_ALPHA = 0.34;
// Puffs live up to 10 s, so the cap leaves room for all of them.
const MAX_PUFFS = 220;

// A soft round blob in the smoke's color; every puff is this sprite, scaled and faded.
function makeSprite(color: string) {
  const size = 128;
  const sprite = document.createElement('canvas');
  sprite.width = sprite.height = size;
  const context = sprite.getContext('2d')!;
  const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, 'transparent');
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);
  return sprite;
}

interface LampSmokeProps {
  /** Where the smoke leaves the lamp, as shares of the lamp's width and height. */
  spout?: Point;
}

/** Real-looking smoke from the lamp's spout: soft puffs that rise, swirl, widen and thin out. */
export default function LampSmoke({ spout = DRAWN_LAMP_SPOUT }: LampSmokeProps) {
  const { x: spoutShareX, y: spoutShareY } = spout;
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || prefersReducedMotion()) return;
    const context = canvas.getContext('2d')!;
    // The color comes from CSS (theme token), so each shop's smoke matches its brand.
    const sprite = makeSprite(getComputedStyle(canvas).color);
    const puffs: Puff[] = [];
    const lamp = canvas.parentElement!;
    let width = 0;
    let height = 0;
    let lampWidth = 0;
    let lampHeight = 0;
    let frame = 0;
    let last = performance.now();
    let toEmit = 0;
    let isOnScreen = true;

    // The canvas is sized from the lamp (CSS), so it resizes whenever the lamp does.
    // One canvas pixel per CSS pixel even on retina screens: the smoke is soft anyway, and it's a quarter of the pixels to redraw.
    const resize = () => {
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      lampWidth = lamp.clientWidth;
      lampHeight = lamp.clientHeight;
      canvas.width = width;
      canvas.height = height;
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    const tick = (now: number) => {
      const seconds = Math.min((now - last) / 1000, 0.05);
      last = now;
      // The canvas is wider and taller than the lamp; its bottom and center line up with the lamp's.
      const spoutX = (width - lampWidth) / 2 + spoutShareX * lampWidth;
      const spoutY = height - (1 - spoutShareY) * lampHeight;

      toEmit += seconds * PUFFS_PER_SECOND;
      while (toEmit >= 1 && puffs.length < MAX_PUFFS) {
        toEmit -= 1;
        puffs.push({ x: spoutX, y: spoutY, age: 0, life: 6 + Math.random() * 4, seed: Math.random() * 1000, rise: 0.6 + Math.random() * 0.5 });
      }

      context.clearRect(0, 0, width, height);
      for (let index = puffs.length - 1; index >= 0; index--) {
        const puff = puffs[index];
        puff.age += seconds;
        const progress = puff.age / puff.life;
        if (progress >= 1) {
          puffs.splice(index, 1);
          continue;
        }
        // Rises slower as it cools; the sway grows with height, which reads as curling smoke.
        puff.y -= seconds * lampHeight * 0.32 * puff.rise * (1 - progress * 0.5);
        puff.x += seconds * lampHeight * 0.09 * (Math.sin(now / 1400 + puff.seed) * (0.3 + progress) + Math.sin(now / 3700 + puff.y / 90) * 0.6);
        const size = lampHeight * (0.05 + progress * 0.55);
        // Fades in fast at the spout, then thins out slowly.
        context.globalAlpha = Math.min(progress * 8, 1) * (1 - progress) ** 1.6 * PUFF_ALPHA;
        context.drawImage(sprite, puff.x - size / 2, puff.y - size / 2, size, size);
      }
      frame = requestAnimationFrame(tick);
    };

    // Draws only while the smoke can be seen: on the one-page home the opening stays mounted under the other parts.
    const start = () => {
      cancelAnimationFrame(frame);
      last = performance.now();
      if (isOnScreen && !document.hidden) frame = requestAnimationFrame(tick);
    };
    const visibility = new IntersectionObserver(([entry]) => {
      isOnScreen = entry.isIntersecting;
      start();
    }, { rootMargin: ON_SCREEN_MARGIN });
    visibility.observe(canvas);
    start();
    document.addEventListener('visibilitychange', start);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      visibility.disconnect();
      document.removeEventListener('visibilitychange', start);
    };
  }, [spoutShareX, spoutShareY]);

  return <canvas ref={canvasRef} className={styles.lampSmoke} aria-hidden='true' />;
}
