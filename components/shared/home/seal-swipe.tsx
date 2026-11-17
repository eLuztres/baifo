'use client';

import { useEffect, useRef, type PointerEvent } from 'react';
import { prefersReducedMotion } from './one-page';

export interface SealMark {
  src: string;
  className?: string;
}

interface SealSwipeProps {
  marks: SealMark[];
  className: string;
  chevronClassName: string;
}

// Less movement than this is a tap; past this share of the way, the drop opens that half.
const TAP_SLOP_PX = 8;
const DROP_SHARE = 0.5;
const SNAP_MS = 350;
const NUDGE_KEY = 'seal-nudged';
const SPRING = `transform ${SNAP_MS}ms cubic-bezier(.3,1.4,.5,1)`;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** The seal on the seam of the split button: tap or swipe it towards a half to open that half. */
export default function SealSwipe({ marks, className, chevronClassName }: SealSwipeProps) {
  const sealRef = useRef<HTMLSpanElement>(null);
  const startXRef = useRef<number | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const hasInteractedRef = useRef(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = (run: () => void, ms: number) => timersRef.current.push(setTimeout(run, ms));
  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  // The halves are the real controls (the seal's siblings), so the seal only ever clicks them.
  const halves = () => {
    const [left, right] = Array.from(sealRef.current?.parentElement?.children ?? []) as HTMLElement[];
    return { left, right };
  };
  const reach = () => {
    const seal = sealRef.current;
    return seal?.parentElement ? seal.parentElement.clientWidth / 2 - seal.clientWidth / 2 - 5 : 0;
  };

  const place = (dx: number, transition = 'none') => {
    const seal = sealRef.current;
    if (!seal) return;
    seal.style.transition = prefersReducedMotion() ? 'none' : transition;
    seal.style.transform = dx ? `translate(calc(-50% + ${dx}px), -50%)` : '';
    seal.querySelectorAll('img').forEach((img) => (img.style.transform = dx ? `rotate(${dx / 3}deg)` : ''));
    // The half it heads for lights up, the other fades.
    const { left, right } = halves();
    const share = Math.min(Math.abs(dx) / (reach() || 1), 1);
    const [target, other] = dx < 0 ? [left, right] : [right, left];
    if (target) Object.assign(target.style, { filter: dx ? `brightness(${1 + share * 0.35})` : '', opacity: '' });
    if (other) Object.assign(other.style, { filter: '', opacity: dx ? String(1 - share * 0.55) : '' });
  };
  const showChevrons = (isShown: boolean) => sealRef.current?.toggleAttribute('data-moving', isShown);
  const springBack = () => {
    place(0, SPRING);
    showChevrons(false);
  };

  // Back from the listings out of the browser's page cache: the seal waits in the middle again.
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => event.persisted && springBack();
    addEventListener('pageshow', onPageShow);
    return () => {
      removeEventListener('pageshow', onPageShow);
      clearTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- springBack only touches the DOM
  }, []);

  // Once per visit, a small nudge both ways shows that the seal moves.
  useEffect(() => {
    if (prefersReducedMotion()) return;
    try {
      if (sessionStorage.getItem(NUDGE_KEY)) return;
    } catch {
      return;
    }
    let isCancelled = false;
    const isStopped = () => isCancelled || hasInteractedRef.current;
    (async () => {
      await wait(1200);
      if (isStopped()) return;
      // Marked only once it really plays (StrictMode runs this effect twice in dev).
      try {
        sessionStorage.setItem(NUDGE_KEY, '1');
      } catch {}
      showChevrons(true);
      for (const dx of [-16, 0, 16, 0]) {
        if (isStopped()) return;
        place(dx, 'transform 450ms ease-in-out');
        await wait(480);
      }
      if (!isStopped()) showChevrons(false);
    })();
    return () => {
      isCancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once on arrival
  }, []);

  const handlePointerDown = (event: PointerEvent<HTMLSpanElement>) => {
    // One finger at a time.
    if (event.button !== 0 || startXRef.current !== null) return;
    event.preventDefault();
    hasInteractedRef.current = true;
    clearTimers();
    pointerIdRef.current = event.pointerId;
    startXRef.current = event.clientX;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    showChevrons(true);
  };

  const handlePointerMove = (event: PointerEvent<HTMLSpanElement>) => {
    if (startXRef.current === null || event.pointerId !== pointerIdRef.current) return;
    const limit = reach();
    place(Math.max(-limit, Math.min(limit, event.clientX - startXRef.current)));
  };

  const handlePointerUp = (event: PointerEvent<HTMLSpanElement>) => {
    if (startXRef.current === null || event.pointerId !== pointerIdRef.current) return;
    const dx = event.clientX - startXRef.current;
    startXRef.current = null;
    const { left, right } = halves();

    // A tap on the seal opens the half under the finger.
    if (Math.abs(dx) < TAP_SLOP_PX) {
      springBack();
      const rect = event.currentTarget.getBoundingClientRect();
      (event.clientX < rect.left + rect.width / 2 ? left : right)?.click();
      return;
    }
    if (Math.abs(dx) < reach() * DROP_SHARE) return springBack();

    place(Math.sign(dx) * reach(), SPRING);
    showChevrons(false);
    later(() => {
      (dx < 0 ? left : right)?.click();
      // Back in the middle once the sheet or the next page is on its way.
      later(springBack, SNAP_MS);
    }, SNAP_MS);
  };

  const handlePointerCancel = (event: PointerEvent<HTMLSpanElement>) => {
    if (event.pointerId !== pointerIdRef.current) return;
    startXRef.current = null;
    springBack();
  };

  return (
    // aria-hidden: the two halves stay the real buttons for keyboards and screen readers.
    <span
      ref={sealRef}
      className={className}
      aria-hidden
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
    >
      <span className={chevronClassName}>‹</span>
      {/* "#still": the animated mark standing still, as in the header for "reduce motion". */}
      {marks.map(({ src, className: markClassName }) => (
        // eslint-disable-next-line @next/next/no-img-element -- a small SVG, shown as is
        <img key={src} src={`${src}#still`} alt='' width={40} height={40} draggable={false} className={markClassName} />
      ))}
      <span className={chevronClassName}>›</span>
    </span>
  );
}
