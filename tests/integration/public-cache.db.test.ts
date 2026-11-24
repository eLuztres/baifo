/**
 * @jest-environment node
 *
 * The public data cache against a real Postgres: every cached read gives back from the cache exactly what the database
 * gave (dates, prices, JSON), and the app's writes empty the cache while its bookkeeping doesn't.
 * Runs only with PUBLIC_CACHE_DB=1 (it writes to the database in .env): `PUBLIC_CACHE_DB=1 npx jest tests/integration/public-cache`.
 */
import { loadEnvConfig } from '@next/env';
import * as nextCache from 'next/cache';
import { prisma } from '@/db/prisma';
import { getInStockRings, getRingSummaries, getSellerNames, getTodayCandidates } from '@/components/shared/home/in-stock-rings';
import { apartListingsWhere, getMercadillos } from '@/lib/mercadillos';
import { getPartners, partnerListingsWhere } from '@/lib/partners';
import { getPlaces } from '@/lib/places';
import { getProductBySlug } from '@/lib/product';
import { getScoutChoices } from '@/lib/scout-choices';
import { getTagOptions } from '@/lib/tags';
import { PUBLIC_DATA_TAG } from '@/lib/public-cache';

// The client connects on its first query, so a skipped run never opens one.
loadEnvConfig(process.cwd());

// Next's data cache on a server: the first call runs the read, later ones get the stored JSON back.
jest.mock('next/cache', () => {
  const store = new Map<string, string>();
  const keyOf = (keyParts: string[], args: unknown[]) => `${keyParts.join(',')}-${JSON.stringify(args)}`;
  return {
    store,
    revalidateTag: jest.fn(),
    unstable_cache: (read: (...args: unknown[]) => Promise<unknown>, keyParts: string[]) => async (...args: unknown[]) => {
      const stored = store.get(keyOf(keyParts, args));
      if (stored !== undefined) return JSON.parse(stored);
      const result = await read(...args);
      store.set(keyOf(keyParts, args), JSON.stringify(result));
      return result;
    },
  };
});
jest.mock('next/server', () => ({ after: jest.fn() }));
jest.mock('@/lib/i18n-server', () => ({ getLocale: async () => 'es', getPictureFallbackLocales: () => ['es', 'en', 'it', 'de', 'fr'] }));

const { store } = nextCache as unknown as { store: Map<string, string> };
const revalidate = nextCache.revalidateTag as unknown as jest.Mock;

const run = process.env.PUBLIC_CACHE_DB === '1' ? describe : describe.skip;
// The shared cache handler a platform (Vercel) installs; without it the reads skip the cache.
(globalThis as { [key: symbol]: unknown })[Symbol.for('@next/cache-handlers')] = { FetchCache: class {} };

/** The read twice: fresh from the database, then from the cache. */
async function freshAndCached<T>(read: () => Promise<T>) {
  store.clear();
  const fresh = await read();
  const cached = await read();
  return { fresh, cached };
}

run('the public data cache on the real database', () => {
  afterAll(() => prisma.$disconnect());

  it('gives back every listing page row exactly', async () => {
    const slugs = (await prisma.product.findMany({ select: { slug: true } })).map((product) => product.slug);
    expect(slugs.length).toBeGreaterThan(0);
    for (const slug of [...slugs, 'no-such-listing']) {
      const { fresh, cached } = await freshAndCached(() => getProductBySlug(slug));
      expect(cached).toStrictEqual(fresh);
    }
  });

  it('gives back the lists of listings exactly', async () => {
    const reads = [
      () => getInStockRings(),
      () => getInStockRings({ NOT: { OR: [apartListingsWhere, partnerListingsWhere] } }),
      () => getRingSummaries({ NOT: { OR: [apartListingsWhere, partnerListingsWhere] } }),
      () => getRingSummaries(apartListingsWhere),
      () => getRingSummaries(),
      () => getTodayCandidates(),
    ];
    for (const read of reads) {
      const { fresh, cached } = await freshAndCached<unknown[]>(read);
      expect(fresh.length).toBeGreaterThan(0);
      expect(cached).toStrictEqual(fresh);
    }
  });

  it('gives back selecciones, partners, etiquetas, places, señaladores and seller names exactly', async () => {
    const t = ((key: string) => key) as unknown as Parameters<typeof getScoutChoices>[0];
    const ids = (await prisma.product.findMany({ select: { id: true } })).map((product) => product.id);
    const reads: (() => Promise<unknown>)[] = [getMercadillos, getPartners, getTagOptions, getPlaces, () => getScoutChoices(t), () => getSellerNames(ids)];
    for (const read of reads) {
      const { fresh, cached } = await freshAndCached(read);
      expect(cached).toStrictEqual(fresh);
    }
  });

  it('takes out exactly what the database would once time passes', async () => {
    const ends = await prisma.product.findMany({ where: { stock: { gt: 0 } }, select: { expiresAt: true, submission: { select: { expiresAt: true } } } });
    const endTimes = [...new Set(ends.map((row) => (row.submission ? row.submission.expiresAt : row.expiresAt)?.getTime()).filter((time): time is number => Boolean(time)))];
    const firstEnds = endTimes.filter((time) => time > Date.now()).sort((a, b) => a - b).slice(0, 4);
    expect(firstEnds.length).toBeGreaterThan(0);
    // Just after the first listings end, tomorrow (a new shop day) and long after most have ended.
    const moments = [...firstEnds.map((time) => time + 1), Date.now() + 24 * 60 * 60 * 1000, Date.now() + 40 * 24 * 60 * 60 * 1000];
    const reads: (() => Promise<unknown[]>)[] = [() => getRingSummaries(), () => getInStockRings(), () => getTodayCandidates(), () => getRingSummaries(apartListingsWhere)];
    let tookOut = 0;
    for (const read of reads) {
      for (const moment of moments) {
        store.clear();
        const before = await read();
        // Only the clock moves; Prisma's own timers stay real.
        jest.useFakeTimers({ now: moment, doNotFake: ['nextTick', 'setImmediate', 'clearImmediate', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'queueMicrotask', 'hrtime', 'performance'] });
        try {
          const fromCache = await read();
          store.clear();
          const fromDatabase = await read();
          expect(fromCache).toStrictEqual(fromDatabase);
          tookOut += before.length - fromCache.length;
        } finally {
          jest.useRealTimers();
        }
      }
    }
    expect(tookOut).toBeGreaterThan(0);
  });

  it('reads the database only once for the same question', async () => {
    store.clear();
    const findMany = jest.spyOn(prisma.product, 'findMany');
    await getRingSummaries();
    await getRingSummaries();
    expect(findMany).toHaveBeenCalledTimes(1);
    findMany.mockRestore();
  });

  it('a listing’s price, dates and pictures come back the same from the cache', async () => {
    const product = await prisma.product.findFirst({ where: { stock: { gt: 0 } }, select: { slug: true } });
    const { fresh, cached } = await freshAndCached(() => getProductBySlug(product!.slug));
    expect(cached!.createdAt).toBeInstanceOf(Date);
    expect(cached!.createdAt.getTime()).toBe(fresh!.createdAt.getTime());
    expect(cached!.price).toBe(fresh!.price);
    expect(cached!.images).toEqual(fresh!.images);
  });

  it('empties the cache on a write a visitor could see, not on bookkeeping or reads', async () => {
    revalidate.mockClear();
    await prisma.product.findMany({ take: 1 });
    const hit = await prisma.rateLimitHit.create({ data: { action: 'public-cache-test', ip: '127.0.0.1' } });
    await prisma.rateLimitHit.delete({ where: { id: hit.id } });
    expect(revalidate).not.toHaveBeenCalled();

    const tag = await prisma.tag.create({ data: { names: { es: 'Prueba caché' } } });
    expect(revalidate).toHaveBeenCalledWith(PUBLIC_DATA_TAG);
    revalidate.mockClear();
    await prisma.tag.delete({ where: { id: tag.id } });
    expect(revalidate).toHaveBeenCalledWith(PUBLIC_DATA_TAG);
  });

  it('empties it after a write inside a transaction too', async () => {
    revalidate.mockClear();
    const place = await prisma.place.findFirst({ select: { id: true, sortOrder: true } });
    await prisma.$transaction(async (tx) => {
      await tx.place.update({ where: { id: place!.id }, data: { sortOrder: place!.sortOrder } });
    });
    expect(revalidate).toHaveBeenCalledWith(PUBLIC_DATA_TAG);
    revalidate.mockClear();
    await prisma.$transaction([prisma.place.updateMany({ where: { id: place!.id }, data: { sortOrder: place!.sortOrder } })]);
    expect(revalidate).toHaveBeenCalledWith(PUBLIC_DATA_TAG);
  });
});
