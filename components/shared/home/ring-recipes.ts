import recipes from '@/brand/rings3d.json';
import type { RingRecipe } from './ring-3d-texture';

/** 3D recipes per product slug; rings without one are shown as cut-out photos instead. */
export const RING_RECIPES = recipes as unknown as Record<string, RingRecipe>;
