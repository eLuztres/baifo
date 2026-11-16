// Each visitor gets their own order of the list; after a few hours the next visit brings a new one.
export const MIX_COOKIE = 'mix';
export const MIX_HOURS = 3;
// A new listing gets a better chance near the top for these first days, without owning it.
const NEW_FOR_MS = 3 * 24 * 60 * 60 * 1000;

// The cookie lives longer than the order, so a page woken up after hours still finds its seed.
export const MIX_COOKIE_DAYS = 7;

/** A seed for a new visitor's order, with when it was made: "seed.timestamp". */
export const newMixSeed = (now = Date.now()) => `${crypto.randomUUID().slice(0, 8)}.${now}`;

/** The same seed, seen now: "old" counts from the last time the list was looked at, not from when it was made. */
export const renewMix = (cookie: string, now = Date.now()) => `${readMixSeed(cookie)}.${now}`;

/** The seed part of the cookie; older cookies are only the seed. */
export const readMixSeed = (cookie = '') => cookie.split('.')[0];

/** Not looked at for MIX_HOURS, or from before the cookie held its time. */
export function isMixOld(cookie: string, now = Date.now()) {
  const madeAt = Number(cookie.split('.')[1]);
  return !madeAt || now - madeAt >= MIX_HOURS * 60 * 60 * 1000;
}

/** A cookie header with one cookie set, replacing an older value of it. */
export function withCookie(header: string | null, name: string, value: string) {
  const others = (header ?? '').split(';').map((part) => part.trim()).filter((part) => part && !part.startsWith(`${name}=`));
  return [...others, `${name}=${value}`].join('; ');
}

/**
 * A new order only for a new visit to the list. A quiet refresh of the page already showing it (the app woken up)
 * keeps its order, so nothing is reshuffled under the person's eyes.
 */
export const needsNewMix = (cookie: string | undefined, isQuietRefresh: boolean, now = Date.now()) =>
  !cookie || (!isQuietRefresh && isMixOld(cookie, now));

// FNV-1a: the same seed and id always give the same number in [0, 1), so the order holds while the visitor browses.
function unitHash(text: string) {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index++) hash = Math.imul(hash ^ text.charCodeAt(index), 16777619);
  return (hash >>> 0) / 2 ** 32;
}

/** A number in [0, 1) per key, the same for the same seed: things placed at random (the Mercadillo rows) stay put
    when the page is drawn again during the visit. */
export const seededRank = (seed: string) => (key: string) => unitHash(`${seed}:${key}`);

/** The listings in the visitor's own order for this seed; new ones lean towards the top. */
export function freshMix<T extends { id: string; createdAt: Date }>(listings: T[], seed: string, now = Date.now()): T[] {
  const placeOf = (listing: T) => {
    const place = unitHash(`${seed}:${listing.id}`);
    return now - listing.createdAt.getTime() < NEW_FOR_MS ? place / 2 : place;
  };
  const places = new Map(listings.map((listing) => [listing.id, placeOf(listing)]));
  return [...listings].sort((a, b) => places.get(a.id)! - places.get(b.id)!);
}
