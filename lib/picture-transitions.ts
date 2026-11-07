import type { PictureTransition } from '@/lib/picture-motion';

interface TransitionScene {
  /** The frame; it clips everything and gives the 3D turn its depth. */
  frame: HTMLElement;
  /** An empty layer above the pictures for the strips a change needs for a moment. */
  fx: HTMLElement;
  from: HTMLElement;
  to: HTMLElement;
}

// Calm on purpose: every change starts and ends softly, nothing jumps or flashes.
const EASE = 'cubic-bezier(.45,0,.25,1)';

/** A copy of the picture to come, laid in the effects layer; the browser already has its file. */
function copyOf(to: HTMLElement, style: Partial<CSSStyleDeclaration>) {
  const copy = to.cloneNode(true) as HTMLElement;
  Object.assign(copy.style, { position: 'absolute', inset: '0', opacity: '1', zIndex: '' }, style);
  return copy;
}

/** `from` keeps its last frame until the change is over, then lets go; the caller hides it. */
const fadeAway = (from: HTMLElement, keyframes: Keyframe[], duration: number) => from.animate(keyframes, { duration, easing: EASE, fill: 'forwards' });

/** Each change ends with `to` showing as it normally does, so the caller only has to hide `from`. */
export const PICTURE_TRANSITIONS: Record<PictureTransition, (scene: TransitionScene) => Promise<unknown>> = {
  soft: ({ to }) => to.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 1400, easing: EASE }).finished,

  // The new picture settles from a little closer while the old one fades.
  zoom: async ({ from, to }) => {
    const away = fadeAway(from, [{ opacity: 1 }, { opacity: 0 }], 1400);
    await to.animate([{ transform: 'scale(1.12)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: 1400, easing: EASE }).finished;
    away.cancel();
  },

  // The new picture glides in from the side, the old one moves a little away.
  slide: async ({ from, to }) => {
    const away = fadeAway(from, [{ transform: 'translateX(0)', opacity: 1 }, { transform: 'translateX(-25%)', opacity: 0.4 }], 1300);
    await to.animate([{ transform: 'translateX(100%)' }, { transform: 'translateX(0)' }], { duration: 1300, easing: EASE }).finished;
    away.cancel();
  },

  // The picture comes in as six strips that fade down one after the other, like a curtain.
  slices: async ({ frame, fx, to }) => {
    const count = 6;
    const width = frame.clientWidth / count;
    to.style.opacity = '0';
    const strips = Array.from({ length: count }, (_, index) => {
      const strip = Object.assign(document.createElement('div'), { className: 'absolute inset-y-0 overflow-hidden' });
      Object.assign(strip.style, { left: `${index * width}px`, width: `${width + 1}px` });
      strip.append(copyOf(to, { left: `${-index * width}px`, width: `${frame.clientWidth}px`, right: 'auto' }));
      fx.append(strip);
      return strip;
    });
    await Promise.all(
      strips.map(
        (strip, index) =>
          strip.animate([{ transform: 'translateY(-12%)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }], { duration: 900, delay: index * 90, easing: EASE, fill: 'backwards' }).finished
      )
    );
    to.style.opacity = '1';
    strips.forEach((strip) => strip.remove());
  },

  circle: ({ to }) => {
    const x = 30 + Math.random() * 40;
    const y = 30 + Math.random() * 40;
    return to.animate([{ clipPath: `circle(0% at ${x}% ${y}%)` }, { clipPath: `circle(140% at ${x}% ${y}%)` }], { duration: 1500, easing: EASE }).finished;
  },

  // Both pictures are sides of a cube that turns a quarter, slowly.
  cube: async ({ frame, from, to }) => {
    const half = frame.clientWidth / 2;
    const side = (degrees: number) => `translateZ(${-half}px) rotateY(${degrees}deg) translateZ(${half}px)`;
    from.style.backfaceVisibility = to.style.backfaceVisibility = 'hidden';
    const options = { duration: 1500, easing: EASE };
    await Promise.all([
      from.animate([{ transform: side(0) }, { transform: side(-90) }], { ...options, fill: 'forwards' }).finished,
      to.animate([{ transform: side(90) }, { transform: side(0) }], options).finished,
    ]);
    from.getAnimations().forEach((a) => a.cancel());
    from.style.backfaceVisibility = to.style.backfaceVisibility = '';
  },
};
