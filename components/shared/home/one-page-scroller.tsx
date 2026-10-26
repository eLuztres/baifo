'use client';

import { useEffect } from 'react';
import { useActiveSection } from '@/components/shared/header/use-active-section';
import { createWheelGestureGate, glideBehavior, isClearlyVertical, isInsideScrollOwner, SECTION_IDS, SECTION_ORDER } from './one-page';

// Keys that turn the page; Shift turns them around, like Shift+Space.
const KEY_DIRECTIONS: Partial<Record<string, number>> = { ArrowDown: 1, PageDown: 1, ' ': 1, ArrowUp: -1, PageUp: -1 };

// A turn's glide; wheel events during it don't start another one.
const TURN_MS = 700;

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

/** Touch turns part by part with CSS scroll snapping (one-page.module.css); this turns one part per key or wheel gesture and lands `/#part` links. */
export default function OnePageScroller() {
  const activeSection = useActiveSection();

  useEffect(() => {
    let isMounted = true;
    // The layout around the parts scrolls, not the window.
    const scroller = document.querySelector('main')?.parentElement;
    if (!scroller) return;

    // With nothing focused the browser sends scroll keys to the window, which doesn't scroll here.
    const handleKeyDown = (event: KeyboardEvent) => {
      const direction = KEY_DIRECTIONS[event.key];
      const hasModifier = event.altKey || event.ctrlKey || event.metaKey;
      if (!direction || hasModifier || event.defaultPrevented || event.target !== document.body) return;
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
    };
  }, []);

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
