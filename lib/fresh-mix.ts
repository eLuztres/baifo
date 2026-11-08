// Each visitor gets their own order of the list; the cookie ends after a few hours, so the next visit brings a new one.
export const MIX_COOKIE = 'mix';
export const MIX_HOURS = 3;
// A new listing gets a better chance near the top for these first days, without owning it.
const NEW_FOR_MS = 3 * 24 * 60 * 60 * 1000;

/** A seed for a new visitor's order. */
export const newMixSeed = () => crypto.randomUUID().slice(0, 8);

// FNV-1a: the same seed and id always give the same number in [0, 1), so the order holds while the visitor browses.
function unitHash(text: string) {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index++) hash = Math.imul(hash ^ text.charCodeAt(index), 16777619);
  return (hash >>> 0) / 2 ** 32;
}

/** The listings in the visitor's own order for this seed; new ones lean towards the top. */
export function freshMix<T extends { id: string; createdAt: Date }>(listings: T[], seed: string, now = Date.now()): T[] {
  const placeOf = (listing: T) => {
    const place = unitHash(`${seed}:${listing.id}`);
    return now - listing.createdAt.getTime() < NEW_FOR_MS ? place / 2 : place;
  };
  const places = new Map(listings.map((listing) => [listing.id, placeOf(listing)]));
  return [...listings].sort((a, b) => places.get(a.id)! - places.get(b.id)!);
}
