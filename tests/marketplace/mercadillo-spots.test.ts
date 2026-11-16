import { pickRowSpots } from '@/lib/mercadillos';
import { seededRank } from '@/lib/fresh-mix';

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

  const movedShare = (before: number, after: number) => {
    let moved = 0;
    for (let seed = 0; seed < 200; seed++) {
      const rank = seededRank(`seed${seed}`);
      const [was, now] = [pickRowSpots(before, 6, rank), pickRowSpots(after, 6, rank)];
      // A row at the end stays at the end.
      moved += was.filter((spot, row) => now[row] !== spot && !(spot === before && now[row] === after)).length;
    }
    return moved / (200 * 6);
  };

  it('keeps every row where it was when a new listing comes in, with the same seed', () => {
    expect(movedShare(74, 75)).toBe(0);
    expect(movedShare(80, 81)).toBe(0);
  });

  it('moves only some rows when the list gains a new spot (every 12 listings)', () => {
    expect(movedShare(72, 73)).toBeLessThan(0.5);
  });

  it("keeps a Mercadillo's row in place when another Mercadillo's row comes or goes", () => {
    let moved = 0;
    for (let seed = 0; seed < 200; seed++) {
      const rank = seededRank(`seed${seed}`);
      const withAll = pickRowSpots(120, 3, rank, ['magma', 'artistas', 'apanadas']);
      const withoutFirst = pickRowSpots(120, 2, rank, ['artistas', 'apanadas']);
      moved += withoutFirst.filter((spot, row) => withAll[row + 1] !== spot).length;
    }
    // Only when the row that left had taken the spot another row wanted most.
    expect(moved / (200 * 2)).toBeLessThan(0.25);
  });

  it('gives the same spots for the same seed', () => {
    expect(pickRowSpots(74, 3, seededRank('abc'))).toEqual(pickRowSpots(74, 3, seededRank('abc')));
  });
});
