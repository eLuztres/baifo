'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useActiveSection } from '@/components/shared/header/use-active-section';
import { createWheelGestureGate, glideBehavior, isClearlyVertical, isInsideScrollOwner, isInsideSideMover, SECTION_IDS, SECTION_ORDER } from './one-page';

// Keys that turn the page; Shift turns them around, like Shift+Space.
const KEY_DIRECTIONS: Partial<Record<string, number>> = { ArrowDown: 1, PageDown: 1, ' ': 1, ArrowUp: -1, PageUp: -1 };

// A turn's glide; wheel events during it don't start another one.
const TURN_MS = 700;

// Finger travel upward on the opening part before it counts as "on to the page below".
const SWIPE_ON_PX = 60;

// Buttons, fields and menus keep their own keys (Space presses a button, arrows move in a menu).
const isPageKeyTarget = (target: EventTarget | null) => target === document.body || (target instanceof HTMLAnchorElement && !target.closest('[role="dialog"], [role="menu"]'));

const getParts = () => SECTION_ORDER.flatMap((id) => document.getElementById(id) ?? []);

/** Where the snapping stops: each part's top (clear of the header) and the end of the page (the footer). */
const getStops = (scroller: HTMLElement) => {
  const scrollerTop = scroller.getBoundingClientRect().top - scroller.scrollTop;
  const maxTop = scroller.scrollHeight - scroller.clientHeight;
  const partTops = getParts().map((part) =>
    Math.min(part.getBoundingClientRect().top - scrollerTop - parseFloat(getComputedStyle(part).scrollMarginTop), maxTop));
  return [...partTops, maxTop];
};

/** Finite animations on a part or around it, like the page's entrance (template.tsx); while they run, the part is shifted. */
const animationsAround = (part: Element) =>
  document.getAnimations().filter(({ effect }) =>
    effect instanceof KeyframeEffect && effect.target?.contains(part) && effect.getComputedTiming().endTime !== Infinity);

interface OnePageScrollerProps {
  /** A page that comes right after the opening part instead of the parts below it (reached by their links). */
  belowHomeHref?: string;
}

/** Touch turns part by part with CSS scroll snapping (one-page.module.css); this turns one part per key or wheel gesture and lands `/#part` links. */
export default function OnePageScroller({ belowHomeHref }: OnePageScrollerProps) {
  const activeSection = useActiveSection();
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;
    // The layout around the parts scrolls, not the window.
    const scroller = document.querySelector('main')?.parentElement;
    if (!scroller) return;

    // Down from the opening part leads on to belowHomeHref; the parts below stay reachable through their links.
    const isAtHome = () => !!belowHomeHref && scroller.scrollTop <= getStops(scroller)[0] + 2;
    let hasLeft = false;
    const leaveHome = () => {
      if (hasLeft || !belowHomeHref) return;
      hasLeft = true;
      router.push(belowHomeHref);
    };
    if (belowHomeHref) router.prefetch(belowHomeHref);

    // With nothing focused the browser sends scroll keys to the window, which doesn't scroll here.
    const handleKeyDown = (event: KeyboardEvent) => {
      const direction = KEY_DIRECTIONS[event.key];
      const hasModifier = event.altKey || event.ctrlKey || event.metaKey;
      if (!direction || hasModifier || event.defaultPrevented) return;
      // Leaving the opening part also works from its buttons, which keep the focus after a click.
      if ((event.shiftKey ? -direction : direction) > 0 && isAtHome() && isPageKeyTarget(event.target)) {
        event.preventDefault();
        return leaveHome();
      }
      if (event.target !== document.body) return;
      event.preventDefault();
      // One screen at most: the snapping stops at the next part.
      scroller.scrollBy({ top: (event.shiftKey ? -direction : direction) * scroller.clientHeight, behavior: glideBehavior() });
    };
    window.addEventListener('keydown', handleKeyDown);

    // Snapping alone lets a wheel or trackpad stop halfway and settle afterwards; here one gesture turns one whole part.
    const isNewWheelGesture = createWheelGestureGate();
    let turnedAt = 0;
    const handleWheel = (event: WheelEvent) => {
      if (event.ctrlKey || !isClearlyVertical(event.deltaX, event.deltaY) || isInsideScrollOwner(event.target)) return;
      if (event.deltaY > 0 && isAtHome()) {
        event.preventDefault();
        if (isNewWheelGesture()) leaveHome();
        return;
      }
      const position = scroller.scrollTop;
      const stops = getStops(scroller);
      const target = event.deltaY > 0
        ? stops.filter((stop) => stop > position + 1).sort((a, b) => a - b)[0]
        : stops.filter((stop) => stop < position - 1).sort((a, b) => b - a)[0];
      // A part taller than the screen (a phone held sideways) still scrolls freely inside.
      if (target === undefined || Math.abs(target - position) > scroller.clientHeight) return;
      event.preventDefault();

      const now = performance.now();
      if (!isNewWheelGesture(now) || now - turnedAt < TURN_MS) return;
      turnedAt = now;
      scroller.scrollTo({ top: target, behavior: glideBehavior() });
    };
    scroller.addEventListener('wheel', handleWheel, { passive: false });

    // An upward swipe on the opening part would snap to the part below; it opens belowHomeHref instead.
    let touchStart: { x: number; y: number } | undefined;
    const handleTouchStart = (event: TouchEvent) => {
      const touch = event.touches[0];
      touchStart = isAtHome() && event.touches.length === 1 && !isInsideSideMover(event.target) ? { x: touch.clientX, y: touch.clientY } : undefined;
    };
    const handleTouchMove = (event: TouchEvent) => {
      if (!touchStart) return;
      const deltaX = event.touches[0].clientX - touchStart.x;
      const deltaY = event.touches[0].clientY - touchStart.y;
      if (deltaY >= 0 || !isClearlyVertical(deltaX, deltaY)) return;
      event.preventDefault();
      if (-deltaY > SWIPE_ON_PX) leaveHome();
    };
    scroller.addEventListener('touchstart', handleTouchStart, { passive: true });
    scroller.addEventListener('touchmove', handleTouchMove, { passive: false });

    // Next jumps to a #part while the loader still shows and the parts don't exist yet, so the landing happens here.
    const part = getParts().find((element) => `#${element.id}` === window.location.hash);
    if (part) {
      const land = () => part.scrollIntoView({ behavior: 'instant', block: 'start' });
      land();
      // The page's entrance still shifts the part, so it lands again once that is over.
      const landedTop = scroller.scrollTop;
      Promise.allSettled(animationsAround(part).map((animation) => animation.finished)).then(() => {
        // A visitor who already moved the page stays where they are.
        if (isMounted && scroller.scrollTop === landedTop) land();
      });
    }

    return () => {
      isMounted = false;
      window.removeEventListener('keydown', handleKeyDown);
      scroller.removeEventListener('wheel', handleWheel);
      scroller.removeEventListener('touchstart', handleTouchStart);
      scroller.removeEventListener('touchmove', handleTouchMove);
    };
  }, [belowHomeHref, router]);

  // The page scrolls inside the layout, so the browser can't bring it back to the part on the way back from a listing:
  // the part's hash can (the landing above). Replaced, so turning parts adds no steps to the back button.
  useEffect(() => {
    const url = new URL(window.location.href);
    const hash = activeSection === SECTION_IDS.home ? '' : `#${activeSection}`;
    if (url.hash === hash) return;
    url.hash = hash;
    window.history.replaceState(null, '', url);
  }, [activeSection]);

  return null;
}
