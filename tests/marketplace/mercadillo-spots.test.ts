import { pickRowSpots } from '@/lib/mercadillos';

jest.mock('@/db/prisma', () => ({ prisma: {} }));

describe('pickRowSpots', () => {
  it('puts a row only after a multiple of 12, never first or last', () => {
    for (let run = 0; run < 50; run++) {
      const [spot] = pickRowSpots(74, 1);
      expect(spot % 12).toBe(0);
      expect(spot).toBeGreaterThan(0);
      expect(spot).toBeLessThan(74);
    }
  });

  it('gives several rows their own spots', () => {
    const spots = pickRowSpots(74, 3);
    expect(new Set(spots).size).toBe(3);
  });

  it('puts rows at the end when the list is short or the spots run out', () => {
    expect(pickRowSpots(5, 1)).toEqual([5]);
    expect(pickRowSpots(12, 1)).toEqual([12]);
    expect(pickRowSpots(0, 1)).toEqual([0]);
    expect(pickRowSpots(13, 2, () => 0)).toEqual([12, 13]);
  });
});
