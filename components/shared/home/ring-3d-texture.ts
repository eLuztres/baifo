/** Paints a ring's outer surface from its recipe: one canvas for color, one for roughness/metalness. */

export type MaterialKind = 'metal' | 'damascus' | 'wood' | 'stone' | 'opal' | 'flake' | 'carbon' | 'lava';

export interface RingStripe {
  kind: MaterialKind;
  color: string;
  /** Extra colors for the chips of opal and flake inlays. */
  colors?: string[];
  /** Share of the band's width, 0–1. */
  w: number;
}

export interface RingRecipe {
  /** Band width relative to the ring's radius. */
  width: number;
  /** How far the outer surface bulges, relative to the radius. */
  dome: number;
  inner: { kind: MaterialKind; color: string };
  stripes: RingStripe[];
  /** A second material that replaces the stripes on part of the circumference (0–1). */
  split?: { kind: MaterialKind; color: string; colors?: string[]; from: number; to: number };
}

// Around the ring × across the band.
const TEXTURE_W = 1024;
const TEXTURE_H = 256;

// [roughness, metalness] per material, 0–1.
const SURFACE: Record<MaterialKind, [number, number]> = {
  metal: [0.22, 1],
  damascus: [0.34, 1],
  wood: [0.58, 0],
  stone: [0.3, 0],
  opal: [0.14, 0.1],
  flake: [0.2, 0.6],
  carbon: [0.42, 0.3],
  lava: [0.8, 0],
};

// Small seeded generator: every visitor sees the same ring, and the server never has to paint.
function seededRandom(seed: string) {
  let state = 2166136261;
  for (const char of seed) state = Math.imul(state ^ char.charCodeAt(0), 16777619);
  return () => {
    state = Math.imul(state ^ (state >>> 15), 2246822507);
    state = Math.imul(state ^ (state >>> 13), 3266489909);
    return ((state ^= state >>> 16) >>> 0) / 4294967296;
  };
}

interface Region {
  x: number;
  y: number;
  w: number;
  h: number;
}

type Painter = (ctx: CanvasRenderingContext2D, region: Region, random: () => number, colors: string[]) => void;

function shade(ctx: CanvasRenderingContext2D, light: boolean, alpha: number) {
  ctx.strokeStyle = ctx.fillStyle = light ? `rgb(255 255 255 / ${alpha})` : `rgb(0 0 0 / ${alpha})`;
}

// Angular chips, as in crushed stone or opal set in resin. Drawn twice so they wrap around the seam.
function chips(ctx: CanvasRenderingContext2D, { x, y, w, h }: Region, random: () => number, count: number, size: number, pick: () => void) {
  for (let i = 0; i < count; i++) {
    const cx = x + random() * w;
    const cy = y + random() * h;
    const corners = 4 + Math.floor(random() * 3);
    const points = Array.from({ length: corners }, (_, corner) => {
      const angle = (corner / corners) * Math.PI * 2 + random() * 0.6;
      const reach = size * (0.45 + random() * 0.55);
      return [Math.cos(angle) * reach, Math.sin(angle) * reach];
    });
    pick();
    for (const offset of [0, -TEXTURE_W, TEXTURE_W]) {
      ctx.beginPath();
      points.forEach(([px, py], index) => ctx[index === 0 ? 'moveTo' : 'lineTo'](cx + px + offset, cy + py));
      ctx.closePath();
      ctx.fill();
    }
  }
}

// Long lines running around the ring: brushed metal, wood grain.
function grain(ctx: CanvasRenderingContext2D, { x, y, w, h }: Region, random: () => number, count: number, wave: number, alpha: number) {
  for (let i = 0; i < count; i++) {
    const baseY = y + random() * h;
    const phase = random() * Math.PI * 2;
    const waves = 1 + Math.floor(random() * 3);
    shade(ctx, random() > 0.5, alpha * (0.4 + random() * 0.6));
    ctx.lineWidth = 0.6 + random() * 1.4;
    ctx.beginPath();
    for (let px = 0; px <= w; px += 16) {
      // Whole waves per turn, so the line meets itself at the seam.
      const py = baseY + Math.sin((px / w) * Math.PI * 2 * waves + phase) * wave;
      ctx[px === 0 ? 'moveTo' : 'lineTo'](x + px, py);
    }
    ctx.stroke();
  }
}

const PAINTERS: Record<MaterialKind, Painter> = {
  metal: (ctx, region, random) => grain(ctx, region, random, 40, 0, 0.1),
  damascus: (ctx, region, random) => grain(ctx, region, random, 34, region.h * 0.35, 0.34),
  wood: (ctx, region, random) => grain(ctx, region, random, 46, region.h * 0.08, 0.3),
  stone: (ctx, region, random) =>
    chips(ctx, region, random, Math.round(region.h * 9), 15, () => shade(ctx, random() > 0.62, 0.05 + random() * 0.2)),
  opal: (ctx, region, random, colors) => {
    chips(ctx, region, random, Math.round(region.h * 7), 12, () => {
      ctx.fillStyle = colors[Math.floor(random() * colors.length)];
      ctx.globalAlpha = 0.35 + random() * 0.5;
    });
    ctx.globalAlpha = 1;
    chips(ctx, region, random, Math.round(region.h * 0.8), 3, () => shade(ctx, true, 0.7));
  },
  flake: (ctx, region, random, colors) => {
    chips(ctx, region, random, Math.round(region.h * 6), 9, () => {
      ctx.fillStyle = colors[Math.floor(random() * colors.length)];
    });
  },
  carbon: (ctx, { x, y, w, h }, random) => {
    shade(ctx, true, 0.06);
    ctx.lineWidth = 3;
    for (let px = -h; px < w + h; px += 9) {
      ctx.beginPath();
      ctx.moveTo(x + px, y);
      ctx.lineTo(x + px + h * (random() > 0.5 ? 1 : -1), y + h);
      ctx.stroke();
    }
  },
  lava: (ctx, region, random) =>
    chips(ctx, region, random, Math.round(region.h * 10), 3, () => shade(ctx, true, 0.05 + random() * 0.22)),
};

function paintRegion(
  color: CanvasRenderingContext2D,
  surface: CanvasRenderingContext2D,
  region: Region,
  material: { kind: MaterialKind; color: string; colors?: string[] },
  random: () => number
) {
  for (const ctx of [color, surface]) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(region.x, region.y, region.w, region.h);
    ctx.clip();
  }
  color.fillStyle = material.color;
  color.fillRect(region.x, region.y, region.w, region.h);
  PAINTERS[material.kind](color, region, random, material.colors ?? [material.color]);

  // three.js reads roughness from the green channel and metalness from the blue one.
  const [roughness, metalness] = SURFACE[material.kind];
  surface.fillStyle = `rgb(0 ${Math.round(roughness * 255)} ${Math.round(metalness * 255)})`;
  surface.fillRect(region.x, region.y, region.w, region.h);
  color.restore();
  surface.restore();
}

function createCanvas(width: number, height: number) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

export function paintRingSurface(recipe: RingRecipe, seed: string) {
  const colorCanvas = createCanvas(TEXTURE_W, TEXTURE_H);
  const surfaceCanvas = createCanvas(TEXTURE_W, TEXTURE_H);
  const color = colorCanvas.getContext('2d')!;
  const surface = surfaceCanvas.getContext('2d')!;
  const random = seededRandom(seed);

  const totalWidth = recipe.stripes.reduce((sum, stripe) => sum + stripe.w, 0);
  let top = 0;
  for (const stripe of recipe.stripes) {
    const height = (stripe.w / totalWidth) * TEXTURE_H;
    paintRegion(color, surface, { x: 0, y: top, w: TEXTURE_W, h: height }, stripe, random);
    top += height;
  }
  if (recipe.split) {
    const { from, to } = recipe.split;
    paintRegion(color, surface, { x: from * TEXTURE_W, y: 0, w: (to - from) * TEXTURE_W, h: TEXTURE_H }, recipe.split, random);
  }
  return { colorCanvas, surfaceCanvas };
}

export function paintInnerSurface(recipe: RingRecipe, seed: string) {
  const colorCanvas = createCanvas(TEXTURE_W / 2, TEXTURE_H / 2);
  const surfaceCanvas = createCanvas(TEXTURE_W / 2, TEXTURE_H / 2);
  const region = { x: 0, y: 0, w: colorCanvas.width, h: colorCanvas.height };
  paintRegion(colorCanvas.getContext('2d')!, surfaceCanvas.getContext('2d')!, region, recipe.inner, seededRandom(`${seed}-inner`));
  return { colorCanvas, surfaceCanvas };
}
