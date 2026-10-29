'use client';

import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CalendarDays, ChevronLeft, ChevronRight, Hourglass, LayoutGrid, Sun, type LucideIcon } from 'lucide-react';
import ProductMedia from '@/components/ProductMedia';
import { FEED_COVER_TRANSITION } from '@/components/shared/product/feed-cover';
import { cn } from '@/lib/utils';

/** The wheel turns like a soft spring that can't overshoot: it keeps a drag's momentum and settles without a bounce. */
const SPRING_STIFFNESS = 60;
const SPRING_DAMPING = 2 * Math.sqrt(SPRING_STIFFNESS);
/** How long a drag's momentum carries the wheel on after the finger lets go. */
const GLIDE_S = 0.3;
/** The category opens once the wheel has stood still this long, so quick turns don't load every page on the way. */
const OPEN_DELAY_MS = 150;
/** A drag this long turns the wheel by one circle. */
const DRAG_PX_PER_ITEM = 70;
/** Below this a press is a tap, not a drag. */
const DRAG_START_PX = 6;
/** Sideways scrolling (trackpad, Shift + mouse wheel) this far turns by one circle; it settles once the scrolling stops. */
const WHEEL_PX_PER_ITEM = 80;
const WHEEL_SETTLE_MS = 150;
/** The circles' track: its half width (in % of the wheel) and how far its back rises, as if seen a little from above. */
const RADIUS_PERCENT = 40;
const TILT_PX = 16;
/** Few categories still sit close together, many still leave room for the front one. */
const MAX_STEP = (2 * Math.PI) / 7;
const MIN_STEP = (2 * Math.PI) / 12;

const ICONS = { all: LayoutGrid, today: Sun, ending: Hourglass, events: CalendarDays } satisfies Record<string, LucideIcon>;

export interface ExploreRingItem {
  /** "all", "today", "ending", "events" or a category's slug. */
  key: string;
  label: string;
  href: string;
  /** A category's picture; the fixed items show their icon instead. */
  image?: string;
}

interface ExploreRingProps {
  items: ExploreRingItem[];
  activeKey: string;
  label: string;
  previousLabel: string;
  nextLabel: string;
}

interface Drag {
  pointerId: number;
  startX: number;
  startRotation: number;
  isDragging: boolean;
  /** The last move, for the speed the wheel glides on with. */
  lastX: number;
  lastAt: number;
}

const wrap = (value: number, count: number) => ((value % count) + count) % count;
// Short numbers, as the browser writes them back: longer ones make the server's page differ from the browser's.
const round = (value: number) => Math.round(value * 1000) / 1000;
const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Where a circle sits on the wheel, `offset` places away from the front: smaller, softer and higher towards the back.
    Only transform and opacity, so the browser moves the circles without laying the page out again. */
const placeOnWheel = (offset: number, count: number) => {
  const angle = offset * Math.min(MAX_STEP, Math.max(MIN_STEP, (2 * Math.PI) / count));
  const depth = Math.cos(angle);
  // Where the circles wrap round they fade out, so none jumps across the wheel; with many, those past the back stay hidden.
  const wrapFade = Math.abs(angle) < Math.PI ? Math.min(1, Math.max(0, (count / 2 - Math.abs(offset)) * 2)) : 0;
  const opacity = round(Math.max(0, 0.15 + 0.85 * depth) * wrapFade);
  // cqw: a share of the wheel's width (it's a size container), so the server draws the same wheel as the browser.
  const x = round(Math.sin(angle) * RADIUS_PERCENT);
  const rise = round(TILT_PX * (1 - depth));
  const scale = round(0.35 + 0.65 * ((1 + depth) / 2) ** 3);
  return {
    transform: `translate(calc(-50% + ${x}cqw), calc(-50% - ${rise}px)) scale(${scale})`,
    opacity: String(opacity),
    zIndex: String(Math.round(depth * 100) + 100),
    pointerEvents: opacity < 0.1 ? ('none' as const) : ('auto' as const),
  };
};

const offsetOf = (index: number, rotation: number, count: number) => wrap(index - rotation + count / 2, count) - count / 2;

/** The feed's categories on a round wheel: the chosen one in front, the others smaller towards the back.
    A swipe, drag, the mouse wheel, the arrow keys or a tap turns it, and the category in front opens. */
const ExploreRing = ({ items, activeKey, label, previousLabel, nextLabel }: ExploreRingProps) => {
  const router = useRouter();
  const count = items.length;
  const indexOf = (key: string) => Math.max(0, items.findIndex((item) => item.key === key));
  // Counts circles, without wrapping round. It moves every frame, so it lives in refs and is drawn straight onto the
  // circles: a React render per frame made the turn stutter. Only the circle in front is state.
  const rotationRef = useRef(indexOf(activeKey));
  const targetRef = useRef(rotationRef.current);
  const velocityRef = useRef(0);
  const frameRef = useRef(0);
  const [frontIndex, setFrontIndex] = useState(() => wrap(Math.round(rotationRef.current), count));
  const openTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const isOpeningRef = useRef(false);
  const wheelSettleTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const dragRef = useRef<Drag>(undefined);
  const wasDraggedRef = useRef(false);
  const wheelRef = useRef<HTMLDivElement>(null);
  const circleRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  // A running turn keeps the closures of the render it started in; the page may have changed since.
  const activeKeyRef = useRef(activeKey);
  activeKeyRef.current = activeKey;

  const paint = () => {
    const rotation = rotationRef.current;
    circleRefs.current.forEach((circle, index) => {
      if (circle) Object.assign(circle.style, placeOnWheel(offsetOf(index, rotation, count), count));
    });
    setFrontIndex(wrap(Math.round(rotation), count));
  };

  const stop = () => {
    cancelAnimationFrame(frameRef.current);
    frameRef.current = 0;
  };

  const openLater = () => {
    clearTimeout(openTimer.current);
    const target = targetRef.current;
    if (!Number.isInteger(target)) return;
    openTimer.current = setTimeout(() => {
      const item = items[wrap(target, count)];
      if (item.key !== activeKeyRef.current) router.push(item.href, { scroll: false });
    }, OPEN_DELAY_MS);
  };

  const step = (now: number, lastAt: number) => {
    const seconds = Math.min(0.05, (now - lastAt) / 1000);
    const distance = targetRef.current - rotationRef.current;
    velocityRef.current += (SPRING_STIFFNESS * distance - SPRING_DAMPING * velocityRef.current) * seconds;
    rotationRef.current += velocityRef.current * seconds;
    const isSettled = Math.abs(distance) < 0.005 && Math.abs(velocityRef.current) < 0.05;
    if (isSettled) {
      rotationRef.current = targetRef.current;
      velocityRef.current = 0;
    }
    paint();
    // The category opens once its circle is as good as in front; the last of the glide doesn't keep it waiting.
    if (!isOpeningRef.current && Math.abs(distance) < 0.05 && Math.abs(velocityRef.current) < 0.3) {
      isOpeningRef.current = true;
      openLater();
    }
    frameRef.current = isSettled ? 0 : requestAnimationFrame((next) => step(next, now));
  };

  // A new target while turning just bends the running turn, so quick taps and arrows flow into one another.
  const turnTo = (target: number) => {
    clearTimeout(openTimer.current);
    isOpeningRef.current = false;
    targetRef.current = target;
    if (prefersReducedMotion()) {
      stop();
      rotationRef.current = target;
      velocityRef.current = 0;
      paint();
      return openLater();
    }
    if (!frameRef.current) {
      const startedAt = performance.now();
      frameRef.current = requestAnimationFrame((now) => step(now, startedAt));
    }
  };

  // The shortest way round to the item, in either direction.
  const nearestTurnTo = (index: number) => {
    const from = Math.round(targetRef.current);
    return from + wrap(index - from + count / 2, count) - count / 2;
  };

  const turn = (by: number) => turnTo(Math.round(targetRef.current) + by);

  // A turn from outside (the browser's back button) turns the wheel too.
  useEffect(() => {
    if (items[wrap(Math.round(targetRef.current), count)]?.key !== activeKey) turnTo(nearestTurnTo(indexOf(activeKey)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey]);

  useEffect(
    () => () => {
      cancelAnimationFrame(frameRef.current);
      clearTimeout(openTimer.current);
      clearTimeout(wheelSettleTimer.current);
    },
    []
  );

  // Only sideways scrolling turns the wheel; up and down always scrolls the page. Native and not passive, so the
  // sideways scroll doesn't also swipe the browser back.
  const turnToRef = useRef(turnTo);
  turnToRef.current = turnTo;
  useEffect(() => {
    const wheel = wheelRef.current;
    if (!wheel) return;
    const handleWheel = (event: WheelEvent) => {
      const sideways = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.shiftKey ? event.deltaY : 0;
      if (event.ctrlKey || !sideways) return;
      event.preventDefault();
      turnToRef.current(targetRef.current + sideways / WHEEL_PX_PER_ITEM);
      clearTimeout(wheelSettleTimer.current);
      wheelSettleTimer.current = setTimeout(() => turnToRef.current(Math.round(targetRef.current)), WHEEL_SETTLE_MS);
    };
    wheel.addEventListener('wheel', handleWheel, { passive: false });
    return () => wheel.removeEventListener('wheel', handleWheel);
  }, []);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    stop();
    clearTimeout(openTimer.current);
    isOpeningRef.current = false;
    velocityRef.current = 0;
    wasDraggedRef.current = false;
    const now = performance.now();
    dragRef.current = { pointerId: event.pointerId, startX: event.clientX, startRotation: rotationRef.current, isDragging: false, lastX: event.clientX, lastAt: now };
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const movedPx = event.clientX - drag.startX;
    if (!drag.isDragging) {
      if (Math.abs(movedPx) < DRAG_START_PX) return;
      drag.isDragging = true;
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    const now = performance.now();
    if (now > drag.lastAt) velocityRef.current = -(event.clientX - drag.lastX) / DRAG_PX_PER_ITEM / ((now - drag.lastAt) / 1000);
    drag.lastX = event.clientX;
    drag.lastAt = now;
    // The wheel follows the finger: dragging left brings the circles on the right to the front.
    rotationRef.current = drag.startRotation - movedPx / DRAG_PX_PER_ITEM;
    paint();
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = undefined;
    if (!drag.isDragging) return turnTo(targetRef.current);
    wasDraggedRef.current = true;
    // A finger that rested before letting go has no momentum left.
    if (performance.now() - drag.lastAt > 100) velocityRef.current = 0;
    const movedPx = event.clientX - drag.startX;
    let target = Math.round(rotationRef.current + velocityRef.current * GLIDE_S);
    // A short flick still turns by one.
    if (target === Math.round(drag.startRotation) && Math.abs(movedPx) > DRAG_PX_PER_ITEM / 3) target -= Math.sign(movedPx);
    turnTo(target);
  };

  const onItemClick = (event: MouseEvent<HTMLAnchorElement>, index: number) => {
    event.preventDefault();
    if (!wasDraggedRef.current) turnTo(nearestTurnTo(index));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const by = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0;
    if (!by) return;
    event.preventDefault();
    turn(by);
    // The focus stays on the circle in front.
    circleRefs.current[wrap(targetRef.current, count)]?.focus({ preventScroll: true });
  };

  const arrowClass =
    'flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground';

  return (
    <nav aria-label={label} onKeyDown={onKeyDown} className='mx-auto w-full max-w-lg'>
      <div className='flex items-center justify-center gap-1'>
        <button type='button' onClick={() => turn(-1)} aria-label={previousLabel} className={arrowClass}>
          <ChevronLeft className='size-5' aria-hidden />
        </button>
        {/* touch-action keeps the page's up and down scrolling; sideways swipes turn the wheel. */}
        <div
          ref={wheelRef}
          aria-roledescription='carousel'
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className='@container relative h-[5.5rem] min-w-0 flex-1 touch-pan-y select-none sm:h-28'
        >
          {/* The track the circles turn on. */}
          <div
            aria-hidden
            className='absolute rounded-[50%] border border-border'
            style={{ left: `${50 - RADIUS_PERCENT}%`, right: `${50 - RADIUS_PERCENT}%`, top: `calc(50% - ${2 * TILT_PX}px)`, height: 2 * TILT_PX }}
          />
          {items.map((item, index) => {
            const isFront = index === frontIndex;
            const Icon = ICONS[item.key as keyof typeof ICONS];
            return (
              <Link
                key={item.key}
                ref={(circle) => {
                  circleRefs.current[index] = circle;
                }}
                href={item.href}
                scroll={false}
                draggable={false}
                data-index={index}
                onClick={(event) => onItemClick(event, index)}
                aria-label={item.label}
                aria-current={item.key === activeKey ? 'page' : undefined}
                tabIndex={isFront ? 0 : -1}
                className='absolute left-1/2 top-1/2 flex size-14 items-center justify-center rounded-full focus-visible:outline-none sm:size-20'
                // The first drawing; turning draws straight onto the circle (paint).
                style={placeOnWheel(offsetOf(index, rotationRef.current, count), count)}
              >
                <span
                  className={cn(
                    'relative flex size-full items-center justify-center overflow-hidden rounded-full border-2 bg-card shadow-sm transition-colors',
                    isFront ? 'border-primary text-primary' : 'border-border text-muted-foreground'
                  )}
                  // The home ring's front card grows into this picture (use-open-feed.ts).
                  style={isFront && item.image ? { viewTransitionName: FEED_COVER_TRANSITION } : undefined}
                >
                  {item.image ? <ProductMedia src={item.image} alt='' fill sizes='5rem' className='pointer-events-none object-cover' /> : Icon && <Icon className='size-6 sm:size-7' aria-hidden />}
                </span>
              </Link>
            );
          })}
        </div>
        <button type='button' onClick={() => turn(1)} aria-label={nextLabel} className={arrowClass}>
          <ChevronRight className='size-5' aria-hidden />
        </button>
      </div>
      {/* Only the one in front is named: the others are read out from their circles. */}
      <p aria-hidden='true' className='mt-1 truncate px-10 text-center text-sm font-semibold'>
        {items[frontIndex]?.label}
      </p>
    </nav>
  );
};

export default ExploreRing;
