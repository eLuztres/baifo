'use client';

import { useEffect, useState } from 'react';
import { getImageProps } from 'next/image';
import { prefersReducedMotion } from './one-page';
import styles from './scene-hero.module.css';

const SCENE_MS = 7000;
const WIDE_SCREEN = '(min-aspect-ratio: 1/1)';

export interface Scene {
  tall?: string;
  wide?: string;
  alt: string;
}

interface SceneCrossfadeProps {
  scenes: Scene[];
}

/** The scenes fade slowly into each other; with "reduce motion" the first one simply stays. */
export default function SceneCrossfade({ scenes: allScenes }: SceneCrossfadeProps) {
  const [isWide, setIsWide] = useState<boolean>();
  const [shown, setShown] = useState(0);
  const [reached, setReached] = useState(0);
  const [isMoving, setIsMoving] = useState(false);

  useEffect(() => {
    const query = window.matchMedia(WIDE_SCREEN);
    const update = () => setIsWide(query.matches);
    update();
    query.addEventListener?.('change', update);
    return () => query.removeEventListener?.('change', update);
  }, []);

  // A scene drawn for one screen shape only is left out on the other. Before the shape is known, the first scene (which has both) shows.
  const scenes = isWide === undefined ? allScenes : allScenes.filter((scene) => (isWide ? scene.wide : scene.tall));

  useEffect(() => {
    if (scenes.length < 2 || prefersReducedMotion()) return;
    setIsMoving(true);
    const timer = setInterval(() => {
      setShown((index) => (index + 1) % scenes.length);
      setReached((index) => Math.min(index + 1, scenes.length - 1));
    }, SCENE_MS);
    return () => clearInterval(timer);
  }, [scenes.length]);

  // Scenes join the page one ahead of the fade, so a visitor who leaves at once loads two pictures, not all of them.
  const mounted = scenes.slice(0, reached + (isMoving ? 2 : 1));

  return (
    <div className={styles.scenes}>
      {mounted.map((scene, index) => (
        <ScenePicture key={scene.tall ?? scene.wide} scene={scene} isShown={index === shown % scenes.length} isFirst={index === 0} />
      ))}
    </div>
  );
}

interface ScenePictureProps {
  scene: Scene;
  isShown: boolean;
  isFirst: boolean;
}

// Art direction (a wide picture on wide screens) needs <picture>; getImageProps keeps next/image's sizes for both.
function ScenePicture({ scene, isShown, isFirst }: ScenePictureProps) {
  const common = { alt: '', fill: true, sizes: '100vw', priority: isFirst };
  const tall = getImageProps({ ...common, src: (scene.tall ?? scene.wide)! }).props;
  const wide = scene.wide && getImageProps({ ...common, src: scene.wide }).props;

  return (
    <picture className={styles.scene} data-shown={isShown}>
      {wide && <source media={WIDE_SCREEN} srcSet={wide.srcSet} sizes={wide.sizes} />}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img {...tall} alt={scene.alt} aria-hidden={!isShown} />
    </picture>
  );
}
