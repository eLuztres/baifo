import type { Prisma } from '@prisma/client';
import { prisma } from '@/db/prisma';

/** A selección's listings: the ones chosen by hand and every one with one of its etiquetas. */
export const listingsOf = (id: string, tagIds: string[]): Prisma.ProductWhereInput => ({
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

// Cards between a selección's row and its own listings in the grid: on a phone six lines, on a computer three, never on one screen.
export const ROW_LISTING_GAP = 12;

/**
 * Every listing for the grid, the selecciones' listings too, each kept `gap` cards from every spot where one of its rows
 * goes (`spotOf`: a row's selección id → its spot; past the end is the end). The mix's order stays as far as it can; when
 * a list is too short for that, a listing takes the farthest place left, never none.
 */
export function spreadRowListings<T extends { mercadilloIds: string[] }>(listings: T[], spotOf: Map<string, number>, gap = ROW_LISTING_GAP): T[] {
  const slots: (T | undefined)[] = new Array(listings.length).fill(undefined);
  const isInRow = (listing: T) => listing.mercadilloIds.some((id) => spotOf.has(id));
  // Cards between the slot and the row, which is drawn before the card at its spot: the same count above it as below.
  const cardsBetween = (slot: number, spot: number) => (slot >= spot ? slot - spot : spot - 1 - slot);
  const distanceFromRows = (listing: T, slot: number) =>
    Math.min(...listing.mercadilloIds.filter((id) => spotOf.has(id)).map((id) => cardsBetween(slot, Math.min(spotOf.get(id)!, listings.length))));
  const nearestFree = (wanted: number, isFarEnough: (slot: number) => boolean) => {
    for (let distance = 0; distance < listings.length; distance++) {
      const slot = [wanted - distance, wanted + distance].find((one) => one >= 0 && one < listings.length && !slots[one] && isFarEnough(one));
      if (slot !== undefined) return slot;
    }
  };
  const tooClose: { listing: T; wanted: number }[] = [];
  listings.forEach((listing, wanted) => {
    if (!isInRow(listing)) return;
    const slot = nearestFree(wanted, (one) => distanceFromRows(listing, one) >= gap);
    if (slot === undefined) tooClose.push({ listing, wanted });
    else slots[slot] = listing;
  });
  for (const { listing, wanted } of tooClose) {
    const farthest = Math.max(...slots.map((taken, slot) => (taken ? -1 : distanceFromRows(listing, slot))));
    slots[nearestFree(wanted, (slot) => distanceFromRows(listing, slot) === farthest)!] = listing;
  }
  const others = listings.filter((listing) => !isInRow(listing));
  return slots.map((listing) => listing ?? others.shift()!);
}
