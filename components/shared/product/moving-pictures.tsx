'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import ProductMedia from '@/components/ProductMedia';
import { prefersReducedMotion } from '@/components/shared/home/one-page';
import { transitionFor, type PictureMotion } from '@/lib/picture-motion';
import { PICTURE_TRANSITIONS } from '@/lib/picture-transitions';
import { cn } from '@/lib/utils';
import { isVideoUrl } from '@/lib/video';

// A picture that doesn't arrive in time is shown anyway, without waiting for it any longer.
const LOAD_WAIT_MS = 3000;
// A card with fewer photos also moves between close-ups of them: parts of the photo it already has, nothing new to load.
const MIN_VIEWS = 3;
const CLOSE_UPS = [
  { x: 30, y: 35 },
  { x: 70, y: 65 },
];
const CLOSE_UP_SCALE = 1.4;

interface PictureView {
  src: string;
  /** A close-up: the point of the photo it zooms into, in %. */
  focus?: { x: number; y: number };
}

/** The photos, plus close-ups of them while there are fewer than MIN_VIEWS; never of a video. */
function viewsOf(images: string[], hasCloseUps: boolean): PictureView[] {
  const views: PictureView[] = images.map((src) => ({ src }));
  if (!hasCloseUps || images.length === 0 || images.some(isVideoUrl)) return views;
  for (let k = 0; views.length < MIN_VIEWS; k++) views.push({ src: images[k % images.length], focus: CLOSE_UPS[k % CLOSE_UPS.length] });
  return views;
}

interface MovingPicturesProps {
  images: string[];
  alt: string;
  motion: PictureMotion;
  sizes: string;
  /** The picture to show; it changes with an animation. Missing: the pictures turn by themselves every `turnMs`. */
  index?: number;
  turnMs?: number;
  /** The list: a listing with few photos moves between close-ups of them too. */
  hasCloseUps?: boolean;
  priority?: boolean;
  /** E.g. `object-contain` for the whole picture. */
  imageClassName?: string;
  className?: string;
  playsWhenVisible?: boolean;
}

/** Waits until the layer's photo can be painted; a video layer has nothing to wait for. */
async function whenReady(layer: HTMLElement) {
  const img = layer.querySelector('img');
  if (!img) return;
  if (!img.complete) {
    await Promise.race([
      new Promise((resolve) => {
        img.addEventListener('load', resolve, { once: true });
        img.addEventListener('error', resolve, { once: true });
      }),
      new Promise((resolve) => setTimeout(resolve, LOAD_WAIT_MS)),
    ]);
  }
  await img.decode().catch(() => undefined);
}

/** A listing's pictures, one at a time, moving from one to the next as the listing chose. The browser does it with the
    photos it already has: only the next one is loaded, while the one before it shows. */
export default function MovingPictures({ images, alt, motion, sizes, index, turnMs, hasCloseUps = false, priority, imageClassName, className, playsWhenVisible }: MovingPicturesProps) {
  const views = viewsOf(images, hasCloseUps && motion !== 'still');
  const [ownIndex, setOwnIndex] = useState(0);
  const wanted = index ?? ownIndex;
  const [shown, setShown] = useState(wanted);
  const [mounted, setMounted] = useState(() => new Set([wanted]));
  const [isVisible, setIsVisible] = useState(false);
  // Fixed: React never writes the layers' visibility again, the animations own it.
  const [firstIndex] = useState(wanted);
  const frameRef = useRef<HTMLDivElement>(null);
  const fxRef = useRef<HTMLDivElement>(null);
  const layers = useRef(new Map<number, HTMLDivElement>());
  const shownRef = useRef(wanted);
  const queue = useRef(Promise.resolve());
  // Cards start at different changes of the mix, so neighbours don't all zoom at once.
  const turns = useRef(Math.floor(Math.random() * 6));
  const isVisibleRef = useRef(false);
  const count = views.length;
  const isMoving = motion !== 'still' && count > 1;

  const setLayer = useCallback((i: number) => (layer: HTMLDivElement | null) => {
    if (layer) layers.current.set(i, layer);
    else layers.current.delete(i);
  }, []);

  // A slow drift on the picture that shows, so it never looks frozen.
  const drift = useCallback(
    (layer: HTMLElement | undefined, i: number) => {
      const picture = layer?.querySelector('[data-drift]');
      if (!picture || motion === 'still' || isVideoUrl(views[i]?.src ?? '') || prefersReducedMotion()) return;
      const x = (Math.random() - 0.5) * 4;
      const y = (Math.random() - 0.5) * 4;
      picture.animate([{ transform: 'scale(1.02)' }, { transform: `scale(1.08) translate(${x}%, ${y}%)` }], {
        duration: (turnMs ?? 6000) + 2000,
        easing: 'linear',
        fill: 'forwards',
      });
    },
    [views, motion, turnMs]
  );

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const observer = new IntersectionObserver(([entry]) => {
      isVisibleRef.current = entry.isIntersecting;
      setIsVisible(entry.isIntersecting);
    }, { threshold: 0.3 });
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (isVisible) drift(layers.current.get(shownRef.current), shownRef.current);
  }, [drift, isVisible]);

  // The next picture loads while this one shows, and only once it is on screen.
  useEffect(() => {
    if (!isVisible || !isMoving) return;
    const next = (shown + 1) % count;
    setMounted((current) => (current.has(next) ? current : new Set(current).add(next)));
  }, [count, isMoving, isVisible, shown]);

  // Turning by itself: only on screen, and a while after the last change ended.
  useEffect(() => {
    if (index !== undefined || !turnMs || !isMoving || !isVisible || prefersReducedMotion()) return;
    // A little longer or shorter each time, so cards that came on screen together don't change together.
    const timer = setTimeout(() => setOwnIndex((shown + 1) % count), turnMs * (0.8 + Math.random() * 0.5));
    return () => clearTimeout(timer);
  }, [count, index, isMoving, isVisible, shown, turnMs]);

  // One change at a time; a picture chosen during one waits for it, and only the last one chosen is shown.
  useEffect(() => {
    if (wanted === shownRef.current) return;
    setMounted((current) => (current.has(wanted) ? current : new Set(current).add(wanted)));
    const target = wanted;
    queue.current = queue.current.then(async () => {
      await new Promise(requestAnimationFrame);
      const from = layers.current.get(shownRef.current);
      const to = layers.current.get(target);
      const frame = frameRef.current;
      const fx = fxRef.current;
      if (!to || !frame || !fx || target === shownRef.current) return;
      await whenReady(to);
      const name = isVisibleRef.current && !prefersReducedMotion() ? transitionFor(motion, turns.current++) : null;
      to.querySelector('[data-drift]')?.getAnimations().forEach((animation) => animation.cancel());
      if (from) from.style.zIndex = '1';
      to.style.zIndex = '2';
      to.style.opacity = '1';
      if (name && from) await PICTURE_TRANSITIONS[name]({ frame, fx, from, to }).catch(() => undefined);
      if (from) {
        from.style.opacity = '0';
        from.style.zIndex = '';
        from.querySelector('[data-drift]')?.getAnimations().forEach((animation) => animation.cancel());
      }
      to.style.zIndex = '1';
      shownRef.current = target;
      drift(to, target);
      setShown(target);
    });
  }, [drift, motion, wanted]);

  return (
    <div ref={frameRef} className={cn('relative size-full overflow-hidden [perspective:1100px]', className)}>
      {views.map(
        ({ src, focus }, i) =>
          mounted.has(i) && (
            <div key={`${i}-${src}`} ref={setLayer(i)} data-index={i} className='absolute inset-0 overflow-hidden' style={{ opacity: i === firstIndex ? 1 : 0, zIndex: i === firstIndex ? 1 : 0 }}>
              <div
                className='absolute inset-0'
                style={focus && { transform: `scale(${CLOSE_UP_SCALE})`, transformOrigin: `${focus.x}% ${focus.y}%` }}
              >
                <div data-drift className='absolute inset-0'>
                  <ProductMedia
                    src={src}
                    alt={i === firstIndex ? alt : ''}
                    fill
                    sizes={sizes}
                    priority={priority && i === firstIndex}
                    loading={i === firstIndex ? undefined : 'eager'}
                    className={imageClassName}
                    playsWhenVisible={playsWhenVisible}
                  />
                </div>
              </div>
            </div>
          )
      )}
      <div ref={fxRef} aria-hidden='true' className='pointer-events-none absolute inset-0 z-[3]' />
    </div>
  );
}
