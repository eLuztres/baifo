'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import RingSpaceField, { SpaceRing } from './ring-space-field';
import { ON_SCREEN_MARGIN } from './one-page';
import { RING_RECIPES } from './ring-recipes';
import styles from './ring-space.module.css';

interface RingSpaceStageProps {
  rings: SpaceRing[];
}

// three.js is large, so it only loads on the home page; the scene mounts once the opening is on screen.
const RingSpace3d = dynamic(() => import('./ring-space-3d'), { ssr: false });

const MIN_3D_RINGS = 4;

const RingSpaceStage = ({ rings }: RingSpaceStageProps) => {
  const fallbackRef = useRef<HTMLDivElement>(null);
  const [hasOpeningShown, setHasOpeningShown] = useState(false);
  const [is3dUnavailable, setIs3dUnavailable] = useState(false);
  const has3d = rings.filter((ring) => RING_RECIPES[ring.slug]).length >= MIN_3D_RINGS;
  // With 3D the opening starts empty and the rings appear out of the sand; swapping photos for 3D rings looked restless.
  const isFallbackHidden = has3d && !is3dUnavailable;

  // Fetches three.js right at hydration, so the first ring isn't waiting on the download too.
  // A visit that lands on another part (Back to shop) has a hash and doesn't load it.
  useEffect(() => {
    if (has3d && !window.location.hash) void import('./ring-space-3d');
  }, [has3d]);

  // The scene starts once the opening is on screen. Off screen, the opening's CSS animations (embers, crater glow)
  // pause: they would keep the compositor redrawing under the other parts.
  useEffect(() => {
    const opening = fallbackRef.current?.parentElement;
    if (!opening) return;
    const observer = new IntersectionObserver(([entry]) => {
      opening.toggleAttribute('data-offscreen', !entry.isIntersecting);
      if (entry.isIntersecting) setHasOpeningShown(true);
    }, { rootMargin: ON_SCREEN_MARGIN });
    observer.observe(opening);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      {/* The photos only mount when they show: hidden, they still downloaded and animated every frame. */}
      <div ref={fallbackRef} className={styles.fallback} data-hidden={isFallbackHidden ? '' : undefined}>
        {!isFallbackHidden && <RingSpaceField rings={rings} />}
      </div>
      {has3d && hasOpeningShown && <RingSpace3d rings={rings} onUnavailable={() => setIs3dUnavailable(true)} />}
    </>
  );
};

export default RingSpaceStage;
