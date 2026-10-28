import { prisma } from '@/db/prisma';
import island from '@/brand/addresses.json';

// The corral's town and its surroundings, e.g. Lajares and El Cotillo for Corralejo.
const NEARBY_KM = 10;
const KM_PER_DEGREE = 111;
const MAX_EARLIER_ADDRESSES = 200;

interface IslandAddresses {
  towns: Record<string, [number, number]>;
  addresses: [string, number, number][];
}

// JSON imports type the pairs as plain number arrays.
const { towns, addresses } = island as unknown as IslandAddresses;

const kmBetween = ([latA, lonA]: [number, number], [latB, lonB]: [number, number]) =>
  KM_PER_DEGREE * Math.hypot(latA - latB, (lonA - lonB) * Math.cos((latA * Math.PI) / 180));

/** The island's addresses around a town (brand/addresses.json), nearest first; the whole island for an unknown town. */
export function addressesNear(townSlug: string | undefined) {
  const center = townSlug ? towns[townSlug] : undefined;
  if (!center) return addresses.map(([label]) => label);
  return addresses
    .map(([label, lat, lon]) => ({ label, km: kmBetween(center, [lat, lon]) }))
    .filter(({ km }) => km <= NEARBY_KM)
    .sort((a, b) => a.km - b.km)
    .map(({ label }) => label);
}

// Events come back to the same venues, so their addresses are the first suggestions.
async function earlierAddresses() {
  const products = await prisma.product.findMany({
    where: { type: 'EVENT', address: { not: null } },
    select: { address: true },
    distinct: ['address'],
    orderBy: { createdAt: 'desc' },
    take: MAX_EARLIER_ADDRESSES,
  });
  return products.flatMap(({ address }) => address ?? []);
}

/** Every address the event field suggests: earlier events' venues first, then the town's surroundings. */
export async function loadAddresses(townSlug: string | undefined) {
  return [...new Set([...(await earlierAddresses()), ...addressesNear(townSlug)])].filter(Boolean);
}
