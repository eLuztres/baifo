/**
 * @jest-environment node
 */
import { Prisma } from '@prisma/client';
import { revalidateTag, unstable_cache } from 'next/cache';
import { after } from 'next/server';
import { workAsyncStorage } from 'next/dist/server/app-render/work-async-storage.external';
import {
  cachePublicRead,
  COMMIT_DELAY_MS,
  fromCacheText,
  isPublicWrite,
  markPublicDataChanged,
  PUBLIC_DATA_LATE_TAG,
  PUBLIC_DATA_TAG,
  refreshAfterWrite,
  STABLE_DATA_SECONDS,
  toCacheText,
} from '@/lib/public-cache';

jest.mock('next/cache', () => ({ revalidateTag: jest.fn(), unstable_cache: jest.fn() }));
jest.mock('next/server', () => ({ after: jest.fn() }));
jest.mock('next/dist/server/app-render/work-async-storage.external', () => ({ workAsyncStorage: { getStore: jest.fn() } }));

const unstableCache = unstable_cache as unknown as jest.Mock;
const revalidate = revalidateTag as unknown as jest.Mock;
const afterMock = after as unknown as jest.Mock;
const getWorkStore = workAsyncStorage.getStore as unknown as jest.Mock;

// Vercel installs its shared cache handler here; Next's own file cache (next dev, next start) leaves it empty.
const HANDLERS = Symbol.for('@next/cache-handlers');
const setPlatformCache = (isInstalled: boolean) => {
  const global = globalThis as { [key: symbol]: unknown };
  if (isInstalled) global[HANDLERS] = { FetchCache: class {} };
  else delete global[HANDLERS];
};
beforeEach(() => setPlatformCache(true));
afterAll(() => setPlatformCache(false));

/** Next's data cache as it behaves on a server: the first call runs the read, later ones get the stored JSON back. */
function withDataCache() {
  const store = new Map<string, string>();
  unstableCache.mockImplementation((read: (...args: unknown[]) => Promise<unknown>) => async (...args: unknown[]) => {
    const key = JSON.stringify(args);
    const stored = store.get(key);
    if (stored !== undefined) return JSON.parse(stored);
    const result = await read(...args);
    store.set(key, JSON.stringify(result));
    return result;
  });
  return store;
}

/** Next outside a request (tests, scripts): unstable_cache has no cache to use. */
function withoutDataCache() {
  unstableCache.mockImplementation(() => async () => {
    throw new Error('Invariant: incrementalCache missing in unstable_cache async () => {}');
  });
}

const ROW = {
  id: 'a1',
  createdAt: new Date('2026-11-24T10:00:00.000Z'),
  reservedUntil: null,
  price: '18.00',
  amount: new Prisma.Decimal('12.50'),
  translations: { en: { name: 'Board' } },
  images: ['https://example.ufs.sh/f/a.jpg'],
  submission: { expiresAt: new Date('2026-12-24T10:00:00.000Z'), tags: [{ id: 't1', names: { es: 'Surf' } }] },
};

describe('the cache text', () => {
  it('gives back dates as dates and decimals as decimals, however deep', () => {
    const back = fromCacheText<typeof ROW>(toCacheText(ROW));
    expect(back).toStrictEqual(ROW);
    expect(back.createdAt).toBeInstanceOf(Date);
    expect(back.submission.expiresAt).toBeInstanceOf(Date);
    expect(Prisma.Decimal.isDecimal(back.amount)).toBe(true);
  });

  it('keeps lists, null and plain values', () => {
    for (const value of [[ROW, ROW], [], null, 0, 'text', { nested: [{ at: new Date(0) }] }]) {
      expect(fromCacheText(toCacheText(value))).toStrictEqual(value);
    }
  });

  it('leaves an object that only looks like a mark alone when it has more keys', () => {
    const value = { $date: 'not a date', other: 1 };
    expect(fromCacheText(toCacheText(value))).toStrictEqual(value);
  });

  it('gives back nothing for nothing', () => {
    expect(fromCacheText(toCacheText(undefined))).toBeUndefined();
  });
});

describe('cachePublicRead', () => {
  it('reads the database once, then gives the same result from the cache', async () => {
    withDataCache();
    const read = jest.fn(async (id: string) => ({ ...ROW, id }));
    const cached = cachePublicRead('row', read, STABLE_DATA_SECONDS);

    const first = await cached('a1');
    const second = await cached('a1');

    expect(read).toHaveBeenCalledTimes(1);
    expect(second).toStrictEqual(first);
    expect(second.createdAt).toBeInstanceOf(Date);
    expect(first).toStrictEqual({ ...ROW, id: 'a1' });
  });

  it('keeps one entry per argument', async () => {
    withDataCache();
    const read = jest.fn(async (id: string) => ({ id }));
    const cached = cachePublicRead('row', read, STABLE_DATA_SECONDS);

    expect(await cached('a')).toEqual({ id: 'a' });
    expect(await cached('b')).toEqual({ id: 'b' });
    expect(await cached('a')).toEqual({ id: 'a' });
    expect(read).toHaveBeenCalledTimes(2);
  });

  it('caches "not found" too, so an unknown address doesn’t wake the database each time', async () => {
    withDataCache();
    const read = jest.fn(async () => null);
    const cached = cachePublicRead('missing', read, STABLE_DATA_SECONDS);

    expect(await cached()).toBeNull();
    expect(await cached()).toBeNull();
    expect(read).toHaveBeenCalledTimes(1);
  });

  it('keys by name and deploy, tags for both refreshes and passes the maximum age', async () => {
    withDataCache();
    await cachePublicRead('places', async () => [], 3600)();
    const [, keyParts, options] = unstableCache.mock.calls.at(-1)!;
    expect(keyParts).toEqual(['public-read', expect.any(String), 'places']);
    expect(options).toEqual({ tags: [PUBLIC_DATA_TAG, PUBLIC_DATA_LATE_TAG], revalidate: 3600 });
  });

  it('reads straight from the database without a platform cache (next dev, next start, tests)', async () => {
    withDataCache();
    setPlatformCache(false);
    const read = jest.fn(async () => ROW);
    const cached = cachePublicRead('row', read, STABLE_DATA_SECONDS);

    expect(await cached()).toBe(ROW);
    expect(await cached()).toBe(ROW);
    expect(read).toHaveBeenCalledTimes(2);
    expect(unstableCache).not.toHaveBeenCalled();
  });

  it('reads straight from the database outside a Next.js request', async () => {
    withoutDataCache();
    const read = jest.fn(async () => ROW);
    const cached = cachePublicRead('row', read, STABLE_DATA_SECONDS);

    expect(await cached()).toBe(ROW);
    expect(await cached()).toBe(ROW);
    expect(read).toHaveBeenCalledTimes(2);
  });

  it('lets a database error through', async () => {
    withDataCache();
    const cached = cachePublicRead('broken', async () => Promise.reject(new Error('connection refused')), STABLE_DATA_SECONDS);
    await expect(cached()).rejects.toThrow('connection refused');
  });
});

describe('isPublicWrite', () => {
  it.each(['create', 'createMany', 'createManyAndReturn', 'update', 'updateMany', 'updateManyAndReturn', 'upsert', 'delete', 'deleteMany'])(
    'counts %s on what visitors see',
    (operation) => {
      expect(isPublicWrite('Product', operation)).toBe(true);
    }
  );

  it.each(['Product', 'Submission', 'Mercadillo', 'Partner', 'Tag', 'Place', 'Seller', 'Scout', 'ShopSettings'])('counts writes to %s', (model) => {
    expect(isPublicWrite(model, 'update')).toBe(true);
  });

  it.each(['findMany', 'findFirst', 'findUnique', 'count', 'aggregate', 'groupBy'])('never counts a read (%s)', (operation) => {
    expect(isPublicWrite('Product', operation)).toBe(false);
  });

  it.each(['User', 'Session', 'Account', 'Verification', 'RateLimit', 'RateLimitHit', 'FailedSignIn', 'AiUsage', 'WhatsappMessage', 'ListingEvent', 'Invite'])(
    'leaves out bookkeeping no page shows (%s)',
    (model) => {
      expect(isPublicWrite(model, 'create')).toBe(false);
    }
  );
});

describe('markPublicDataChanged', () => {
  it('empties the cache now and once more after the response', async () => {
    await markPublicDataChanged();
    expect(revalidate).toHaveBeenCalledWith(PUBLIC_DATA_TAG);
    expect(afterMock).toHaveBeenCalledTimes(1);

    afterMock.mock.calls[0][0]();
    expect(revalidate).toHaveBeenLastCalledWith(PUBLIC_DATA_LATE_TAG);
  });

  it('never breaks the write: outside a request or while a page renders, Next refuses quietly', async () => {
    revalidate.mockImplementationOnce(() => {
      throw new Error('used "revalidateTag public-data" during render which is unsupported');
    });
    afterMock.mockImplementationOnce(() => {
      throw new Error('`after` was called outside a request scope');
    });
    await expect(markPublicDataChanged()).resolves.toBeUndefined();
  });

  it('still empties it after the response when Next refuses it during a render', async () => {
    revalidate.mockImplementationOnce(() => {
      throw new Error('used "revalidateTag public-data" during render which is unsupported');
    });
    await markPublicDataChanged();
    expect(afterMock).toHaveBeenCalledTimes(1);
  });
});

describe('the direct refresh for writes in background work', () => {
  const sharedCache = { revalidateTag: jest.fn(async () => {}) };
  beforeEach(() => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'queueMicrotask'] });
    getWorkStore.mockReturnValue({ incrementalCache: sharedCache });
  });
  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    getWorkStore.mockReset();
  });

  it('tells the shared cache directly at once, and again once a transaction has had time to commit', async () => {
    await markPublicDataChanged();
    await Promise.resolve();
    expect(sharedCache.revalidateTag).toHaveBeenCalledTimes(1);
    expect(sharedCache.revalidateTag).toHaveBeenCalledWith([PUBLIC_DATA_TAG, PUBLIC_DATA_LATE_TAG]);
    jest.advanceTimersByTime(COMMIT_DELAY_MS - 1);
    expect(sharedCache.revalidateTag).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(1);
    await Promise.resolve();
    expect(sharedCache.revalidateTag).toHaveBeenCalledTimes(2);
  });

  it('never throws from the timer, even if the shared cache does', async () => {
    getWorkStore.mockReturnValue({
      incrementalCache: {
        revalidateTag: () => {
          throw new Error('cache down');
        },
      },
    });
    await expect(markPublicDataChanged()).resolves.toBeUndefined();
    expect(() => jest.advanceTimersByTime(COMMIT_DELAY_MS)).not.toThrow();
    await Promise.resolve();
  });

  it('tells it at every write and only once more after the last one of a burst', async () => {
    await markPublicDataChanged();
    jest.advanceTimersByTime(COMMIT_DELAY_MS / 2);
    await markPublicDataChanged();
    await markPublicDataChanged();
    await Promise.resolve();
    expect(sharedCache.revalidateTag).toHaveBeenCalledTimes(3);
    jest.advanceTimersByTime(COMMIT_DELAY_MS - 1);
    expect(sharedCache.revalidateTag).toHaveBeenCalledTimes(3);
    jest.advanceTimersByTime(1);
    await Promise.resolve();
    expect(sharedCache.revalidateTag).toHaveBeenCalledTimes(4);
  });

  it('does nothing directly outside a request, and a failing cache never breaks anything', async () => {
    getWorkStore.mockReturnValue(undefined);
    await markPublicDataChanged();
    jest.advanceTimersByTime(COMMIT_DELAY_MS);
    expect(sharedCache.revalidateTag).not.toHaveBeenCalled();
    expect(revalidate).toHaveBeenCalledWith(PUBLIC_DATA_TAG);

    getWorkStore.mockReturnValue({ incrementalCache: { revalidateTag: jest.fn(async () => Promise.reject(new Error('cache down'))) } });
    await expect(markPublicDataChanged()).resolves.toBeUndefined();
    jest.advanceTimersByTime(COMMIT_DELAY_MS);
  });
});

describe('refreshAfterWrite', () => {
  it('empties the cache after a write a visitor could see, and returns its result', async () => {
    const query = jest.fn(async () => ({ id: 'p1' }));
    await expect(refreshAfterWrite({ model: 'Product', operation: 'update', args: { where: { id: 'p1' } }, query })).resolves.toEqual({ id: 'p1' });
    expect(query).toHaveBeenCalledWith({ where: { id: 'p1' } });
    expect(revalidate).toHaveBeenCalledWith(PUBLIC_DATA_TAG);
  });

  it('leaves the cache alone on reads and bookkeeping', async () => {
    const query = jest.fn(async () => []);
    await refreshAfterWrite({ model: 'Product', operation: 'findMany', args: {}, query });
    await refreshAfterWrite({ model: 'RateLimitHit', operation: 'create', args: {}, query });
    await refreshAfterWrite({ model: 'Session', operation: 'update', args: {}, query });
    expect(revalidate).not.toHaveBeenCalled();
    expect(afterMock).not.toHaveBeenCalled();
  });

  it('leaves the cache alone when the write fails', async () => {
    const query = jest.fn(async () => Promise.reject(new Error('unique constraint')));
    await expect(refreshAfterWrite({ model: 'Tag', operation: 'create', args: {}, query })).rejects.toThrow('unique constraint');
    expect(revalidate).not.toHaveBeenCalled();
  });

  it('empties it only once the write is done', async () => {
    let finishWrite = () => {};
    const query = jest.fn(() => new Promise<void>((resolve) => (finishWrite = resolve)));
    const writing = refreshAfterWrite({ model: 'Submission', operation: 'update', args: {}, query });
    await Promise.resolve();
    expect(revalidate).not.toHaveBeenCalled();
    finishWrite();
    await writing;
    expect(revalidate).toHaveBeenCalledWith(PUBLIC_DATA_TAG);
  });
});
