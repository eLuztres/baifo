/** Home, showroom, shop, workshop and contact are parts of one scrolling page; these are their element ids. */
export const SECTION_IDS = {
  home: 'home',
  showroom: 'showroom',
  shop: 'shop',
  workshop: 'workshop',
  contact: 'contact',
} as const;

export type SectionId = (typeof SECTION_IDS)[keyof typeof SECTION_IDS];

export const SECTION_ORDER: SectionId[] = Object.values(SECTION_IDS);

export const ONE_PAGE_PATH = '/';

// IntersectionObserver margin for "on screen": the part above the current one still reaches under the sticky header,
// so that strip doesn't count.
export const ON_SCREEN_MARGIN = '-20% 0px 0px 0px';

export const sectionHref = (id: SectionId) => (id === SECTION_IDS.home ? ONE_PAGE_PATH : `${ONE_PAGE_PATH}#${id}`);

/** Up or down only when clearly more vertical than sideways, so a slanted swipe or wheel turn is never read both ways. */
export const isClearlyVertical = (deltaX: number, deltaY: number) => Math.abs(deltaY) > 2 * Math.abs(deltaX);

export const isClearlySideways = (deltaX: number, deltaY: number) => Math.abs(deltaX) > 2 * Math.abs(deltaY);

export const isInDialog = (target: EventTarget | null) => target instanceof Element && !!target.closest('[role="dialog"]');

// Wheel events closer together than this belong to one gesture (a trackpad flick keeps sending them while it coasts).
const WHEEL_GESTURE_GAP_MS = 200;

/** Tells whether a wheel event starts a new gesture, so one flick turns one part or ring, never several. */
export function createWheelGestureGate() {
  let lastWheelAt = 0;
  return (now = performance.now()) => {
    const isNewGesture = now - lastWheelAt >= WHEEL_GESTURE_GAP_MS;
    lastWheelAt = now;
    return isNewGesture;
  };
}

/** Things that move sideways themselves keep their sideways swipes: the category selector (data-swipe-owner),
    carousels, scrolling rows and inputs; so does the shop's tree (data-scroll-owner). pan-x only stops native
    up-and-down scrolling of a part. */
export function isInsideSideMover(target: EventTarget | null) {
  for (let element = target instanceof Element ? target : null; element && element !== document.body; element = element.parentElement) {
    if (element.matches('input, textarea, select, [aria-roledescription="carousel"], [data-swipe-owner], [data-scroll-owner]')) return true;
    const { overflowX, touchAction } = getComputedStyle(element);
    if (touchAction !== 'auto' && !touchAction.startsWith('pan-x')) return true;
    if ((overflowX === 'auto' || overflowX === 'scroll') && element.scrollWidth > element.clientWidth) return true;
  }
  return false;
}

/** The shop's tree scrolls inside itself (data-scroll-owner); the wheel there never turns the page. */
export const isInsideScrollOwner = (target: EventTarget | null) =>
  target instanceof Element && !!target.closest('[data-scroll-owner]');

export const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const glideBehavior = (): ScrollBehavior => (prefersReducedMotion() ? 'auto' : 'smooth');

/** Glides to a part; its scroll margin keeps it clear of the sticky header. */
export function scrollToSection(id: SectionId) {
  document.getElementById(id)?.scrollIntoView({ behavior: glideBehavior(), block: 'start' });
}

/** Moves keyboard and screen-reader focus to a part, without a jump (the glide scrolls there). */
export function focusSection(id: SectionId) {
  const element = document.getElementById(id);
  if (!element) return;
  // Focusable only until focus leaves it; a permanent tabindex would make every click inside the part focus the whole part.
  element.tabIndex = -1;
  element.addEventListener('blur', () => element.removeAttribute('tabindex'), { once: true });
  element.focus({ preventScroll: true });
}
