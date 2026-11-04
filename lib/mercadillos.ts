import { prisma } from '@/db/prisma';

/** Every Mercadillo in the shop's order, with how many listings it holds. */
export const getMercadillos = () =>
  prisma.mercadillo.findMany({
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    include: { _count: { select: { products: true } } },
  });

export type Mercadillo = Awaited<ReturnType<typeof getMercadillos>>[number];

// Divides evenly by the list's 2, 3 and 4 columns, so a full-width row never leaves a gap before it.
const ROW_STEP = 12;

/** After how many listings each Mercadillo's row goes: a random spot in the list, each its own while spots last, then the end. */
export function pickRowSpots(listingCount: number, rowCount: number, random: () => number = Math.random): number[] {
  const free = Array.from({ length: Math.ceil(listingCount / ROW_STEP) - 1 }, (_, index) => (index + 1) * ROW_STEP).filter((spot) => spot < listingCount);
  return Array.from({ length: rowCount }, () => (free.length > 0 ? free.splice(Math.floor(random() * free.length), 1)[0] : listingCount));
}
