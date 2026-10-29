'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUp } from 'lucide-react';
import { createWheelGestureGate, isClearlyVertical, isInsideSideMover, SECTION_IDS } from '@/components/shared/home/one-page';
import SlideLink from '@/components/shared/slide-link';
import { slideTo } from '@/components/shared/slide-navigation';
import { cn } from '@/lib/utils';
import styles from './pull-up-home.module.css';

// How far past the top a pull goes before it counts: finger travel, or wheel/trackpad scrolling.
const PULL_TOUCH_PX = 110;
const PULL_WHEEL_PX = 220;
// A pull that stops this long without reaching the end lets go.
const PULL_IDLE_MS = 500;
const PULL_KEYS = new Set(['PageUp', 'Home']);
// Wheel lines and pages are turned into pixels like a browser scrolls them.
const WHEEL_UNIT_PX = [1, 16, 800];

interface PullUpHomeProps {
  href: string;
  /** Read out and shown on hover: the button itself is only an arrow, to fit in the title's line. */
  label: string;
  className?: string;
}

// Home has arrived once its opening part is on the page.
const HOME_READY = `#${SECTION_IDS.home}`;

const isAtTop = () => window.scrollY <= 0;

/** At the top of a page, one more pull up (wheel, trackpad, swipe, Page Up or Home) goes back to `href`. The small arrow
    fills as the visitor pulls and is a plain link too. Only a pull that starts at the top counts, never the end of reading upward. */
export default function PullUpHome({ href, label, className }: PullUpHomeProps) {
  const router = useRouter();
  const [pull, setPull] = useState(0);
  const hintRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    router.prefetch(href);
    let hasLeft = false;
    let pulledPx = 0;
    let idleTimer: ReturnType<typeof setTimeout> | undefined;
    const show = (amount: number) => {
      const progress = Math.min(1, Math.max(0, amount));
      setPull(progress);
      if (progress < 1 || hasLeft) return;
      hasLeft = true;
      slideTo(router, href, 'up', HOME_READY);
    };
    const letGoLater = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        pulledPx = 0;
        show(0);
      }, PULL_IDLE_MS);
    };

    const isNewWheelGesture = createWheelGestureGate();
    let hasGestureStartedAtTop = false;
    const handleWheel = (event: WheelEvent) => {
      if (isNewWheelGesture()) hasGestureStartedAtTop = isAtTop();
      if (event.ctrlKey || !isClearlyVertical(event.deltaX, event.deltaY)) return;
      if (event.deltaY > 0 || !hasGestureStartedAtTop || !isAtTop()) {
        pulledPx = 0;
        return show(0);
      }
      pulledPx -= event.deltaY * WHEEL_UNIT_PX[event.deltaMode];
      show(pulledPx / PULL_WHEEL_PX);
      letGoLater();
    };

    let touchStart: { x: number; y: number } | undefined;
    let touchPull = 0;
    const handleTouchStart = (event: TouchEvent) => {
      const touch = event.touches[0];
      touchStart = isAtTop() && event.touches.length === 1 && !isInsideSideMover(event.target) ? { x: touch.clientX, y: touch.clientY } : undefined;
    };
    const handleTouchMove = (event: TouchEvent) => {
      if (!touchStart) return;
      const deltaX = event.touches[0].clientX - touchStart.x;
      const deltaY = event.touches[0].clientY - touchStart.y;
      if (deltaY <= 0 || !isClearlyVertical(deltaX, deltaY)) {
        touchPull = 0;
        return show(0);
      }
      // The pull replaces the browser's bounce and pull-to-refresh at the top.
      event.preventDefault();
      touchPull = deltaY / PULL_TOUCH_PX;
      setPull(Math.min(1, touchPull));
    };
    const handleTouchEnd = () => {
      if (touchStart) show(touchPull >= 1 ? 1 : 0);
      touchStart = undefined;
      touchPull = 0;
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const hasModifier = event.altKey || event.ctrlKey || event.metaKey || event.shiftKey;
      if (!PULL_KEYS.has(event.key) || hasModifier || event.defaultPrevented || !isAtTop()) return;
      if (event.target !== document.body && event.target !== hintRef.current) return;
      event.preventDefault();
      show(1);
    };

    window.addEventListener('wheel', handleWheel, { passive: true });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('touchcancel', handleTouchEnd);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(idleTimer);
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [href, router]);

  return (
    <SlideLink
      ref={hintRef}
      href={href}
      direction='up'
      readySelector={HOME_READY}
      aria-label={label}
      title={label}
      className={cn(styles.hint, className)}
      style={{ '--pull': pull } as React.CSSProperties}
      data-pulling={pull > 0}
    >
      <ArrowUp className='size-4' aria-hidden='true' />
    </SlideLink>
  );
}
