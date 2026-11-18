/** How a listing's pictures move from one to the next; 'mix' takes a different one each time, 'still' none. */
export const PICTURE_MOTIONS = ['mix', 'soft', 'slide', 'slices', 'circle', 'cube', 'still'] as const;
export type PictureMotion = (typeof PICTURE_MOTIONS)[number];
export type PictureTransition = Exclude<PictureMotion, 'mix' | 'still'>;

// No zoom: pictures never grow or shrink, only the change between them moves. A listing saved with 'zoom' gets the mix.
const TRANSITIONS: PictureTransition[] = ['soft', 'slide', 'circle', 'slices', 'cube'];

export const toPictureMotion = (value: string | null | undefined): PictureMotion =>
  PICTURE_MOTIONS.includes(value as PictureMotion) ? (value as PictureMotion) : 'mix';

/** The change to make for the `turn`-th picture: the chosen one, or the next of the mix. */
export function transitionFor(motion: PictureMotion, turn: number): PictureTransition | null {
  if (motion === 'still') return null;
  return motion === 'mix' ? TRANSITIONS[turn % TRANSITIONS.length] : motion;
}
