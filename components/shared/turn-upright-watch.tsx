'use client';

import { useEffect } from 'react';

// Tablets held sideways are fine; only phone-sized screens get the note.
const PHONE_MAX_SHORT_SIDE_PX = 500;

/** Real rotation, from the screen: the viewport's shape also turns wide when the keyboard opens (e.g. in the reservation form). */
const isPhoneSideways = () => {
  const type = screen.orientation?.type;
  const isLandscape = type ? type.startsWith('landscape') : Math.abs(Number(window.orientation ?? 0)) === 90;
  const isPhone = window.matchMedia('(pointer: coarse)').matches && Math.min(screen.width, screen.height) <= PHONE_MAX_SHORT_SIDE_PX;
  return isLandscape && isPhone;
};

/** Marks <html data-sideways> while a phone is held sideways; the note itself is shown by CSS (turn-upright.module.css). */
export default function TurnUprightWatch() {
  useEffect(() => {
    const update = () => document.documentElement.toggleAttribute('data-sideways', isPhoneSideways());
    update();
    screen.orientation?.addEventListener('change', update);
    window.addEventListener('orientationchange', update);
    return () => {
      screen.orientation?.removeEventListener('change', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  return null;
}
