import { toPictureMotion, transitionFor } from '@/lib/picture-motion';

describe('transitionFor', () => {
  it('keeps the chosen change every time', () => {
    expect([0, 1, 2].map((turn) => transitionFor('cube', turn))).toEqual(['cube', 'cube', 'cube']);
  });

  it('takes a different change each turn in the mix', () => {
    expect(new Set([0, 1, 2, 3, 4, 5].map((turn) => transitionFor('mix', turn))).size).toBe(6);
  });

  it('makes no change for still pictures', () => {
    expect(transitionFor('still', 0)).toBeNull();
  });
});

describe('toPictureMotion', () => {
  it('falls back to the mix for an unknown value', () => {
    expect(toPictureMotion('glitch')).toBe('mix');
    expect(toPictureMotion(null)).toBe('mix');
    expect(toPictureMotion('slices')).toBe('slices');
  });
});
