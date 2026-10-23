'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { ON_SCREEN_MARGIN, prefersReducedMotion } from './one-page';
import { paintInnerSurface, paintRingSurface, RingRecipe } from './ring-3d-texture';
import { RING_RECIPES } from './ring-recipes';
import { SpaceRing } from './ring-space-field';
import styles from './ring-space.module.css';

interface RingSpace3dProps {
  rings: SpaceRing[];
  onUnavailable: () => void;
}

const OUTER_RADIUS = 1;
const BAND_THICKNESS = 0.11;
const AROUND_SEGMENTS = 96;
const PROFILE_STEPS = 12;
const CAMERA_Z = 12;
const CAMERA_FOV = 35;
// The ring itself stays a little smaller than its spot, so the sand swirl has room around it.
const RING_FILL = 0.78;
const HOVER_SCALE = 1.08;
const PARALLAX = 0.7;

// Del grano al anillo: one ring at a time is gathered out of the desert sand, shows itself, and returns to sand.
// What is seen is little; what stays unseen, much more.
const GATHER_S = 5;
const CONDENSE_S = 1.8;
const PRESENT_S = 8;
const RELEASE_S = 4;
const REST_S = 1.2;
const CYCLE_S = GATHER_S + CONDENSE_S + PRESENT_S + RELEASE_S + REST_S;
const GRAINS = 2600;
const GRAIN_SIZE = 0.035;
// Each grain sets off a little later than the one before, so the sand rises like a breath, not a block.
const GRAIN_STAGGER = 0.35;

// Where a ring appears, beside the title in turn: x/y in % of the scene, size in vmin.
const APPEAR_SPOTS = [
  { x: 21, y: 44, size: 26 },
  { x: 79, y: 40, size: 26 },
];

// While it shows itself, the ring glides along a small loop on its own side of the title: out, up and back in.
// The loop stays small, so the ring mostly turns in place instead of wandering; slow turns read as calm and precious.
const LOOP_TURN = 1.5 * Math.PI;
const LOOP_WIDTH = 0.14;
const LOOP_HEIGHT = 0.12;
// Radians per second around the ring's own axis: about one full turn every 6 seconds.
const SPIN_SPEED = 1.1;
// Radians per second the ring rolls over, like a planet: about every 5 s it turns from looking
// through the hole to seeing only its edge and back.
const TUMBLE_SPEED = 0.6;
// Radians per second of the gentle sway and float on top of the turning.
const SWAY_SPEED = 0.35;

const easeInOut = (t: number) => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(Math.max(t, 0), 1));

function setOpacity(mesh: THREE.Group, opacity: number) {
  mesh.traverse((child) => {
    if (child instanceof THREE.Mesh) child.material.opacity = opacity;
  });
}

function surfaceMaterial({ colorCanvas, surfaceCanvas }: ReturnType<typeof paintRingSurface>, side: THREE.Side) {
  const map = new THREE.CanvasTexture(colorCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  const surface = new THREE.CanvasTexture(surfaceCanvas);
  for (const texture of [map, surface]) {
    texture.wrapS = THREE.RepeatWrapping;
    texture.anisotropy = 8;
  }
  // Roughness and metalness are 1 here so the painted map alone decides them.
  // Transparent so a ring can fade in and out; at full opacity it looks the same.
  return new THREE.MeshStandardMaterial({
    map,
    roughnessMap: surface,
    metalnessMap: surface,
    roughness: 1,
    metalness: 1,
    side,
    transparent: true,
  });
}

function buildRing(recipe: RingRecipe, slug: string) {
  const innerRadius = OUTER_RADIUS - BAND_THICKNESS;
  const half = recipe.width / 2;
  // The outer face in cross-section: a gentle arc from one edge of the band to the other.
  const profile = Array.from({ length: PROFILE_STEPS + 1 }, (_, step) => {
    const t = step / PROFILE_STEPS;
    return new THREE.Vector2(OUTER_RADIUS + recipe.dome * Math.sin(Math.PI * t), (t - 0.5) * recipe.width);
  });
  const outer = new THREE.Mesh(
    new THREE.LatheGeometry(profile, AROUND_SEGMENTS),
    surfaceMaterial(paintRingSurface(recipe, slug), THREE.FrontSide)
  );

  const innerPaint = paintInnerSurface(recipe, slug);
  const inner = new THREE.Mesh(
    new THREE.CylinderGeometry(innerRadius, innerRadius, recipe.width, AROUND_SEGMENTS, 1, true),
    surfaceMaterial(innerPaint, THREE.BackSide)
  );
  const rimMaterial = surfaceMaterial(innerPaint, THREE.DoubleSide);
  const rims = [half, -half].map((y) => {
    const rim = new THREE.Mesh(new THREE.RingGeometry(innerRadius, OUTER_RADIUS, AROUND_SEGMENTS), rimMaterial);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = y;
    return rim;
  });

  const ring = new THREE.Group();
  ring.add(outer, inner, ...rims);
  return ring;
}

// Puts a ring at its spot on screen and remembers where the desert floor lies below it.
function placeRing(ring: THREE.Group, spot: (typeof APPEAR_SPOTS)[number], aspect: number, viewportMin: number, viewportHeight: number) {
  const halfHeight = Math.tan(THREE.MathUtils.degToRad(CAMERA_FOV / 2)) * CAMERA_Z;
  ring.position.set((spot.x / 50 - 1) * halfHeight * aspect, -(spot.y / 50 - 1) * halfHeight, 0);
  const screenShare = ((spot.size / 100) * viewportMin) / viewportHeight;
  ring.userData.baseScale = screenShare * halfHeight * RING_FILL;
  ring.userData.baseX = ring.position.x;
  ring.userData.baseY = ring.position.y;
  ring.userData.halfHeight = halfHeight;
  // Rings left of the title loop out to the left, rings right of it to the right.
  ring.userData.side = spot.x < 50 ? -1 : 1;
  ring.userData.groundY = -halfHeight * 0.78;
}

const RingSpace3d = ({ rings, onUnavailable }: RingSpace3dProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const [hoveredIndex, setHoveredIndex] = useState(-1);
  const router = useRouter();

  // Every ring with a 3D recipe takes its turn to be gathered out of the sand.
  const pool = rings.filter((ring) => RING_RECIPES[ring.slug]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let renderer: THREE.WebGLRenderer;
    try {
      // Phones draw the full-screen canvas every frame: retina screens skip MSAA and stay at 1.5x, which hides the edges well enough.
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: window.devicePixelRatio < 2 });
    } catch {
      // No WebGL: the cut-out photos show instead.
      onUnavailable();
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.9;

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    // A neutral studio room for the metal to mirror; without it polished rings render black.
    const room = new RoomEnvironment();
    const environment = pmrem.fromScene(room, 0.04);
    room.dispose();
    scene.environment = environment.texture;
    scene.environmentIntensity = 0.8;
    const background = getComputedStyle(canvas).getPropertyValue('--background').trim() || '#000';
    scene.fog = new THREE.Fog(background, CAMERA_Z - 1, CAMERA_Z + 11);
    const keyLight = new THREE.DirectionalLight(0xffe2b0, 2.2);
    keyLight.position.set(-4, 6, 8);
    scene.add(keyLight);

    const camera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, 0.1, 60);
    camera.position.z = CAMERA_Z;

    // Rings are built one by one when their turn comes, so the page doesn't paint thirty textures up front.
    const meshes = new Map<number, THREE.Group>();
    const ringAt = (index: number) => {
      const existing = meshes.get(index);
      if (existing) return existing;
      const mesh = buildRing(RING_RECIPES[pool[index].slug], pool[index].slug);
      mesh.userData.index = index;
      mesh.userData.scale = 1;
      meshes.set(index, mesh);
      return mesh;
    };

    // The sand: every grain has a home on the ring's surface (in the ring's own space) and a place on the dune.
    const grainHome = new Float32Array(GRAINS * 3);
    const grainAngle = new Float32Array(GRAINS);
    const grainDune = new Float32Array(GRAINS * 3);
    const grainDelay = new Float32Array(GRAINS);
    const grainWind = new Float32Array(GRAINS * 3);
    for (let grain = 0; grain < GRAINS; grain++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = OUTER_RADIUS - BAND_THICKNESS + Math.random() * (BAND_THICKNESS + 0.03);
      grainAngle[grain] = angle;
      grainHome.set([radius, (Math.random() - 0.5) * 0.3, 0], grain * 3);
      grainDune.set([(Math.random() - 0.5) * 7, Math.random() * 0.4, (Math.random() - 0.5) * 2], grain * 3);
      grainDelay[grain] = Math.random() * GRAIN_STAGGER;
      grainWind.set([1.6 + Math.random() * 2.4, (Math.random() - 0.3) * 0.8, (Math.random() - 0.5) * 1.5], grain * 3);
    }
    const sandGeometry = new THREE.BufferGeometry();
    const sandPositions = new Float32Array(GRAINS * 3);
    sandGeometry.setAttribute('position', new THREE.BufferAttribute(sandPositions, 3));
    const sandMaterial = new THREE.PointsMaterial({
      color: 0xe9c48c,
      size: GRAIN_SIZE,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const sand = new THREE.Points(sandGeometry, sandMaterial);
    sand.frustumCulled = false;
    scene.add(sand);

    let current = ringAt(0);
    let turn = 0;
    let cycleStart = 0;
    scene.add(current);
    setOpacity(current, 0);

    const placeCurrent = () => {
      const { clientWidth: width, clientHeight: height } = canvas;
      placeRing(current, APPEAR_SPOTS[turn % APPEAR_SPOTS.length], camera.aspect, Math.min(width, height), height);
      current.rotation.set(0.9, turn * 1.7, 0.25);
    };

    const resize = () => {
      const { clientWidth: width, clientHeight: height } = canvas;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      placeCurrent();
    };
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);

    const pointer = new THREE.Vector2(0, 0);
    const raycaster = new THREE.Raycaster();
    let hovered = -1;
    let hasPointer = false;
    let isPresenting = false;

    const pick = (event: PointerEvent | MouseEvent) => {
      if (!isPresenting) return -1;
      const box = canvas.getBoundingClientRect();
      pointer.set(((event.clientX - box.left) / box.width) * 2 - 1, -((event.clientY - box.top) / box.height) * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      return raycaster.intersectObject(current, true).length > 0 ? (current.userData.index as number) : -1;
    };
    const handleMove = (event: PointerEvent) => {
      hasPointer = event.pointerType === 'mouse';
      const next = pick(event);
      if (next === hovered) return;
      hovered = next;
      canvas.style.cursor = next >= 0 ? 'pointer' : '';
      setHoveredIndex(next);
    };
    const handleLeave = () => {
      hasPointer = false;
      hovered = -1;
      setHoveredIndex(-1);
    };
    const handleClick = (event: MouseEvent) => {
      const index = pick(event);
      if (index >= 0) router.push(`/product/${pool[index].slug}`);
    };
    canvas.addEventListener('pointermove', handleMove);
    canvas.addEventListener('pointerleave', handleLeave);
    canvas.addEventListener('click', handleClick);

    const isReducedMotion = prefersReducedMotion();
    const clock = new THREE.Clock();
    const projected = new THREE.Vector3();
    const point = new THREE.Vector3();
    const dune = new THREE.Vector3();
    let frame = 0;
    let isVisible = true;

    // Where grain `grain` sits on the ring when the mandala it draws has closed by `closing` (0 = wide swirl, 1 = on the band).
    const onRing = (grain: number, closing: number, target: THREE.Vector3) => {
      const open = (1 - closing) ** 2;
      const angle = grainAngle[grain] + open * 5;
      const radius = grainHome[grain * 3] * (1 + open * 1.6);
      target.set(Math.cos(angle) * radius, grainHome[grain * 3 + 1] * closing, Math.sin(angle) * radius);
      return target.applyMatrix4(current.matrixWorld);
    };

    const nextRing = () => {
      scene.remove(current);
      turn += 1;
      current = ringAt(turn % pool.length);
      scene.add(current);
      setOpacity(current, 0);
      placeCurrent();
    };

    const render = () => {
      if (!isVisible) return;
      frame = requestAnimationFrame(render);
      const delta = Math.min(clock.getDelta(), 0.05);
      const time = clock.elapsedTime;

      // A hovered ring stays: the cycle simply waits while someone looks at it.
      if (hovered >= 0) cycleStart += delta;
      let phaseTime = isReducedMotion ? GATHER_S + CONDENSE_S : time - cycleStart;
      if (phaseTime >= CYCLE_S) {
        cycleStart = time;
        phaseTime = 0;
        nextRing();
      }

      const gatherEnd = GATHER_S;
      const condenseEnd = gatherEnd + CONDENSE_S;
      const presentEnd = condenseEnd + PRESENT_S;
      const releaseEnd = presentEnd + RELEASE_S;

      // Glides once it is solid and stays where it ended, so it turns back into sand right there.
      const travel = isReducedMotion ? 0 : easeInOut((phaseTime - condenseEnd) / PRESENT_S);
      const loopAngle = travel * LOOP_TURN;
      const { baseX, baseY, halfHeight, side } = current.userData;
      // Leans more inward than outward, so the ring never swings past the edge of a narrow screen.
      const loopX = 0.675 * Math.sin(loopAngle) - 0.325 * (1 - Math.cos(loopAngle));
      current.position.x = baseX + side * LOOP_WIDTH * halfHeight * loopX;
      current.position.y = baseY + LOOP_HEIGHT * halfHeight * (1 - Math.cos(loopAngle)) + Math.sin(time * SWAY_SPEED) * 0.06;
      // Spins round its own axis and rolls over, so the inlay, the inside and the edge all come into view.
      if (!isReducedMotion) {
        current.rotation.y += SPIN_SPEED * delta;
        current.rotation.x += TUMBLE_SPEED * delta;
        current.rotation.z = 0.25 + Math.sin(time * SWAY_SPEED) * 0.3;
      }
      current.userData.scale = THREE.MathUtils.lerp(current.userData.scale, hovered >= 0 ? HOVER_SCALE : 1, 0.08);
      current.scale.setScalar(current.userData.baseScale * current.userData.scale);
      current.updateMatrixWorld();
      // How solid the ring is, and how much of it is still sand.
      const ringPresence =
        phaseTime < gatherEnd ? 0
        : phaseTime < condenseEnd ? easeInOut((phaseTime - gatherEnd) / CONDENSE_S)
        : phaseTime < presentEnd ? 1
        : phaseTime < releaseEnd ? 1 - easeInOut((phaseTime - presentEnd) / (RELEASE_S * 0.6))
        : 0;
      setOpacity(current, ringPresence);
      isPresenting = ringPresence > 0.6;

      const isGathering = phaseTime < condenseEnd;
      const isReleasing = phaseTime >= presentEnd;
      sandMaterial.opacity =
        isGathering ? Math.min(phaseTime / 1.2, 1) * (1 - 0.85 * ringPresence)
        : isReleasing ? 0.9 * (1 - easeInOut((phaseTime - presentEnd) / RELEASE_S))
        : 0;

      if (sandMaterial.opacity > 0.001) {
        const groundY = current.userData.groundY as number;
        for (let grain = 0; grain < GRAINS; grain++) {
          dune.set(
            current.position.x + grainDune[grain * 3],
            groundY + grainDune[grain * 3 + 1],
            grainDune[grain * 3 + 2]
          );
          if (isGathering) {
            // Lifted off the dune, the grains circle and draw a closing mandala until they lie on the band.
            const progress = Math.min(Math.max((phaseTime / GATHER_S - grainDelay[grain]) / (1 - GRAIN_STAGGER), 0), 1);
            onRing(grain, easeInOut(progress), point);
            point.lerp(dune, 1 - easeInOut(Math.min(progress * 1.8, 1)));
          } else {
            // Released, the ring turns back into sand and the wind carries it away to the dune.
            const away = easeInOut((phaseTime - presentEnd) / RELEASE_S);
            onRing(grain, 1, point);
            point.x += grainWind[grain * 3] * away;
            point.y += grainWind[grain * 3 + 1] * away - away * away * 1.2;
            point.z += grainWind[grain * 3 + 2] * away;
          }
          // Plain writes: an array per grain would make 2600 short-lived arrays every frame.
          sandPositions[grain * 3] = point.x;
          sandPositions[grain * 3 + 1] = point.y;
          sandPositions[grain * 3 + 2] = point.z;
        }
        sandGeometry.attributes.position.needsUpdate = true;
      }

      // The camera leans with the mouse, so the ring and the dune slide against each other.
      const targetX = hasPointer && !isReducedMotion ? pointer.x * PARALLAX : 0;
      const targetY = hasPointer && !isReducedMotion ? pointer.y * PARALLAX : 0;
      camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetX, 0.05);
      camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetY, 0.05);
      camera.lookAt(0, 0, -2);

      const label = labelRef.current;
      if (label && hovered >= 0) {
        projected.copy(current.position).project(camera);
        label.style.left = `${(projected.x / 2 + 0.5) * 100}%`;
        label.style.top = `${(-projected.y / 2 + 0.5) * 100}%`;
      }
      renderer.render(scene, camera);
    };
    render();
    canvas.dataset.ready = '';

    // Off screen the loop stops, so the page can go idle; the clock skips the time away and the ring carries on where it was.
    const visibility = new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting;
      cancelAnimationFrame(frame);
      if (!isVisible) return;
      clock.elapsedTime -= clock.getDelta();
      frame = requestAnimationFrame(render);
    }, { rootMargin: ON_SCREEN_MARGIN });
    visibility.observe(canvas);

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      visibility.disconnect();
      canvas.removeEventListener('pointermove', handleMove);
      canvas.removeEventListener('pointerleave', handleLeave);
      canvas.removeEventListener('click', handleClick);
      // Rings not on stage right now aren't in the scene, so they're cleaned up by hand alongside it.
      sandGeometry.dispose();
      sandMaterial.dispose();
      [scene, ...meshes.values()].forEach((root) => root.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.geometry.dispose();
        const material = object.material as THREE.MeshStandardMaterial;
        material.map?.dispose();
        material.roughnessMap?.dispose();
        material.dispose();
      }));
      environment.dispose();
      pmrem.dispose();
      renderer.dispose();
      // dispose() keeps the WebGL context; browsers allow only a few, and every home visit makes a new one.
      // Only once the canvas has left the page: React's dev double-run mounts again on this same canvas.
      if (!canvas.isConnected) renderer.forceContextLoss();
    };
    // The ring list comes from the server and doesn't change while the page is open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hoveredRing = pool[hoveredIndex];

  return (
    <>
      <canvas ref={canvasRef} className={styles.canvas} aria-hidden='true' />
      <span ref={labelRef} className={`${styles.label} ${styles.label3d}`} data-visible={hoveredRing ? '' : undefined}>
        {hoveredRing?.name}
        {hoveredRing?.price && <span className={styles.labelPrice}>{hoveredRing.price}</span>}
      </span>
      {/* The canvas can't be reached by keyboard or screen readers, so the rings are also plain links; a focused one shows. */}
      <ul className={styles.ringLinks}>
        {pool.map((ring) => (
          <li key={ring.slug}>
            <Link href={`/product/${ring.slug}`} className={styles.ringLink}>
              {ring.name} {ring.price}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
};

export default RingSpace3d;
