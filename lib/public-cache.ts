import { Prisma } from '@prisma/client';
import { DEPLOYMENT_VERSION } from '@/lib/constants';

/**
 * What visitors see (listings, selecciones, places, …) is kept in Next's data cache, so bots and visitors don't wake the
 * database on every page. Any write through the shop's Prisma client empties it (see refreshPublicCache).
 * Next's cache functions are imported on first use: the database client imports this file, also in tests and scripts.
 */
export const PUBLIC_DATA_TAG = 'public-data';
// Emptied once more after the response, once background work (the AI finishing a listing) is done too.
export const PUBLIC_DATA_LATE_TAG = 'public-data-late';

/** Writes empty the cache at once; this only bounds what none empties: changes made outside the shop (scripts, by hand)
    and background work cut off before Next sent its late refresh. */
export const STABLE_DATA_SECONDS = 12 * 60 * 60;

const DATE_KEY = '$date';
const DECIMAL_KEY = '$decimal';

// The data cache stores JSON: dates and decimals are marked, so a cached result is the same as a fresh one.
export function toCacheText(value: unknown): string | undefined {
  return JSON.stringify(value, function (this: Record<string, unknown>, key: string, item: unknown) {
    const raw = this[key];
    if (raw instanceof Date) return { [DATE_KEY]: raw.toISOString() };
    if (Prisma.Decimal.isDecimal(raw)) return { [DECIMAL_KEY]: raw.toString() };
    return item;
  });
}

export function fromCacheText<T>(text: string | undefined): T {
  if (text === undefined) return undefined as T;
  return JSON.parse(text, (_key, item) => {
    if (item === null || typeof item !== 'object' || Array.isArray(item)) return item;
    const keys = Object.keys(item);
    if (keys.length !== 1) return item;
    if (keys[0] === DATE_KEY) return new Date(item[DATE_KEY]);
    if (keys[0] === DECIMAL_KEY) return new Prisma.Decimal(item[DECIMAL_KEY]);
    return item;
  });
}

// Next's own file cache (next dev, next start) empties a tag only the first time in a process (15.5), so it would serve
// old listings: the cache is only used with the shared cache handler a platform installs, as Vercel does.
const hasPlatformCache = () => Boolean((globalThis as { [key: symbol]: { FetchCache?: unknown } | undefined })[Symbol.for('@next/cache-handlers')]?.FetchCache);
// Outside a Next.js request there is no data cache either.
const isOutsideNext = (error: unknown) => error instanceof Error && error.message.includes('incrementalCache missing');

/** `read` through the data cache, for `maxAgeSeconds` at most. The deploy is part of the key: a new one never reads
    rows shaped by older code. */
export function cachePublicRead<Args extends unknown[], Result>(name: string, read: (...args: Args) => Promise<Result>, maxAgeSeconds: number) {
  let cached: ((...args: Args) => Promise<string | undefined>) | undefined;
  return async (...args: Args): Promise<Result> => {
    if (!hasPlatformCache()) return read(...args);
    const { unstable_cache } = await import('next/cache');
    cached ??= unstable_cache(async (...args: Args) => toCacheText(await read(...args)), ['public-read', DEPLOYMENT_VERSION, name], {
      tags: [PUBLIC_DATA_TAG, PUBLIC_DATA_LATE_TAG],
      revalidate: maxAgeSeconds,
    });
    let text: string | undefined;
    try {
      text = await cached(...args);
    } catch (error) {
      if (!isOutsideNext(error)) throw error;
      return read(...args);
    }
    return fromCacheText<Result>(text);
  };
}

// Bookkeeping no page shows: writing it (a sign-in, a contact click's rate limit, the listing log) keeps the cache.
const PRIVATE_MODELS = new Set(['User', 'Account', 'Session', 'Verification', 'RateLimit', 'RateLimitHit', 'FailedSignIn', 'AiUsage', 'WhatsappMessage', 'ListingEvent', 'Invite']);
const WRITES = new Set(['create', 'createMany', 'createManyAndReturn', 'update', 'updateMany', 'updateManyAndReturn', 'upsert', 'delete', 'deleteMany']);

export const isPublicWrite = (model: string | undefined, operation: string) => WRITES.has(operation) && !(model && PRIVATE_MODELS.has(model));

// Long enough for the transaction around a write to commit, so no visitor caches the rows from before it.
export const COMMIT_DELAY_MS = 1000;
let directRefresh: ReturnType<typeof setTimeout> | undefined;

/** Empties the public data cache after a write. */
export async function markPublicDataChanged() {
  // Never fails the write: without Next (scripts, tests) the cache's age covers it.
  try {
    const [{ revalidateTag }, { after }, { workAsyncStorage }] = await Promise.all([
      import('next/cache'),
      import('next/server'),
      import('next/dist/server/app-render/work-async-storage.external'),
    ]);
    // Reads later in this request skip the cache, and it is emptied once the action or route is done. Next refuses it
    // while a page renders: the late tag below covers that.
    try {
      revalidateTag(PUBLIC_DATA_TAG);
    } catch {}
    // A tag already emptied in this request isn't emptied again after the response, so work in `after()` uses its own.
    after(() => revalidateTag(PUBLIC_DATA_LATE_TAG));
    // Next sends tags from `after()` only once all of it is done: a listing put online would wait for its WhatsApp
    // messages or pictures. So the shared cache is also told directly: now, and again once the burst of writes is
    // over, since a write inside a transaction only commits after this.
    const incrementalCache = workAsyncStorage.getStore()?.incrementalCache;
    if (!incrementalCache) return;
    const tellSharedCache = () => Promise.resolve().then(() => incrementalCache.revalidateTag([PUBLIC_DATA_TAG, PUBLIC_DATA_LATE_TAG])).catch(() => {});
    tellSharedCache();
    clearTimeout(directRefresh);
    directRefresh = setTimeout(tellSharedCache, COMMIT_DELAY_MS);
  } catch {}
}

interface PrismaOperation {
  model?: string;
  operation: string;
  args: unknown;
  query: (args: unknown) => Promise<unknown>;
}

/** Runs one Prisma operation; a write a visitor could see then empties the public data cache. */
export async function refreshAfterWrite({ model, operation, args, query }: PrismaOperation) {
  const result = await query(args);
  if (isPublicWrite(model, operation)) await markPublicDataChanged();
  return result;
}

export const refreshPublicCache = Prisma.defineExtension({
  name: 'refresh-public-cache',
  query: { $allModels: { $allOperations: refreshAfterWrite } },
});
