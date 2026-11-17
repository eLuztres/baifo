import type { Prisma } from '@prisma/client';
import { prisma } from '@/db/prisma';

/** A selección's listings: the ones chosen by hand and every one with one of its etiquetas. */
const listingsOf = (id: string, tagIds: string[]): Prisma.ProductWhereInput => ({
  OR: [{ mercadillos: { some: { id } } }, { submission: { tags: { some: { id: { in: tagIds } } } } }],
});

/** Every selección (Mercadillo) in the shop's order, with its etiquetas and how many listings it holds. */
export const getMercadillos = async () => {
  const mercadillos = await prisma.mercadillo.findMany({
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    include: { tags: { select: { id: true } } },
  });
  const counts = await Promise.all(mercadillos.map(({ id, tags }) => prisma.product.count({ where: listingsOf(id, tags.map((tag) => tag.id)) })));
  return mercadillos.map(({ tags, ...mercadillo }, index) => ({ ...mercadillo, tagIds: tags.map((tag) => tag.id), _count: { products: counts[index] } }));
};

/** The selecciones a listing is in: the ones it was chosen for by hand, and every one holding one of its etiquetas. */
export const mercadilloIdsOf = (chosenIds: string[], tagIds: string[], mercadillos: { id: string; tagIds: string[] }[]) => [
  ...new Set([...chosenIds, ...mercadillos.filter((mercadillo) => mercadillo.tagIds.some((id) => tagIds.includes(id))).map((mercadillo) => mercadillo.id)]),
];

/** What a listing's page shows of its selecciones: `chosen` finds the ones chosen by hand, `tagIds` are its etiquetas. */
export const getListingMercadillos = (chosen: Prisma.MercadilloWhereInput, tagIds: string[]) =>
  prisma.mercadillo.findMany({
    where: { OR: [chosen, { tags: { some: { id: { in: tagIds } } } }] },
    select: { slug: true, name: true, icon: true },
    orderBy: { sortOrder: 'asc' },
  });

export type Mercadillo = Awaited<ReturnType<typeof getMercadillos>>[number];

// Divides evenly by the list's 2, 3 and 4 columns, so a full-width row never leaves a gap before it.
const ROW_STEP = 12;

/**
 * After how many listings each Mercadillo's row goes: a random spot in the list, each its own while spots last, then
 * the end. Each row picks its spot by its own `rank` and key (its Mercadillo's id), so with a seeded rank a new listing
 * or another Mercadillo's row coming or going doesn't move the rows around.
 */
export function pickRowSpots(listingCount: number, rowCount: number, rank: (key: string) => number = () => Math.random(), keys: string[] = []): number[] {
  const free = Array.from({ length: Math.ceil(listingCount / ROW_STEP) - 1 }, (_, index) => (index + 1) * ROW_STEP).filter((spot) => spot < listingCount);
  return Array.from({ length: rowCount }, (_, row) => {
    if (free.length === 0) return listingCount;
    const ranks = free.map((spot) => rank(`${keys[row] ?? `row${row}`}:${spot}`));
    return free.splice(ranks.indexOf(Math.min(...ranks)), 1)[0];
  });
}
