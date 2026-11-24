import { prisma } from '@/db/prisma';
import {
  getInStockRings,
  getInStockRingsPage,
  getRingSummaries,
  getTodayCandidates,
  isStillInShop,
  type RingSummary,
} from '@/components/shared/home/in-stock-rings';
import { findNextRing } from '@/components/shared/home/materials';

jest.mock('@/db/prisma', () => ({ prisma: { product: { findMany: jest.fn() } } }));
jest.mock('@/lib/i18n-server', () => ({ getLocale: async () => 'es', getPictureFallbackLocales: () => ['es', 'en', 'it', 'de', 'fr'] }));

const findMany = prisma.product.findMany as unknown as jest.Mock;

/** A row as the full select returns it. */
const row = (id: string) => ({
  id,
  slug: id,
  name: id,
  shortName: null,
  images: [`/${id}.jpg`],
  price: '10.00',
  priceMax: null,
  reservedUntil: null,
  createdAt: new Date(0),
  condition: null,
  translations: {},
  type: 'PRODUCT',
  serviceType: null,
  startsAt: null,
  placeId: null,
  mercadillos: [],
  expiresAt: null,
  submission: null,
});

const summary = (slug: string): RingSummary => ({ id: `id-${slug}`, slug, createdAt: new Date(0), placeId: null });

beforeEach(() => findMany.mockReset());

describe('getInStockRings', () => {
  it('loads every ring in stock, with no cap', async () => {
    findMany.mockResolvedValue([row('a')]);
    const rings = await getInStockRings();
    const args = findMany.mock.calls[0][0];
    expect(args.take).toBeUndefined();
    expect(args.where).toHaveProperty('images');
    expect(rings[0]).toMatchObject({ slug: 'a', image: '/a.jpg', isReserved: false });
  });

  it("ends a seller's listing with its submission and an admin's with its own end", async () => {
    const submissionEnd = new Date('2099-11-01T00:00:00Z');
    const productEnd = new Date('2099-12-01T00:00:00Z');
    findMany.mockResolvedValue([
      { ...row('seller'), expiresAt: productEnd, submission: { rawImages: [], expiresAt: submissionEnd, tags: [] } },
      { ...row('admin'), expiresAt: productEnd },
      row('forever'),
    ]);
    const rings = await getInStockRings();
    expect(rings.map((ring) => ring.endsAt)).toEqual([submissionEnd, productEnd, null]);
  });

  it('leaves out a listing past its end at once, by the same end the daily run uses', async () => {
    findMany.mockResolvedValue([]);
    await getInStockRings();
    const { where } = findMany.mock.calls[0][0];
    const [bySubmission, byOwnEnd] = where.AND;
    expect(bySubmission.OR[1].submission.is.OR[1].expiresAt.gt).toBeInstanceOf(Date);
    expect(byOwnEnd.NOT).toMatchObject({ submission: { is: null }, expiresAt: { lte: expect.any(Date) } });
  });

  it('keeps a listing without an end, e.g. one in a "Solo aquí" selección', async () => {
    findMany.mockResolvedValue([]);
    await getInStockRings();
    const { where } = findMany.mock.calls[0][0];
    // A NOT on its end would be NULL in SQL and drop it: the end may be missing or still ahead.
    expect(where.AND[0].OR).toEqual([{ submission: { is: null } }, { submission: { is: { OR: [{ expiresAt: null }, { expiresAt: { gt: expect.any(Date) } }] } } }]);
  });

  it('narrows the rings in stock without loosening them', async () => {
    findMany.mockResolvedValue([]);
    await getInStockRings({ slug: 'a' });
    const { where } = findMany.mock.calls[0][0];
    expect(where.AND).toHaveLength(2);
    expect(where.AND[0]).toHaveProperty('images');
    expect(where.AND[1]).toEqual({ slug: 'a' });
  });
});

describe('getInStockRingsPage', () => {
  it('asks for one more than a page and hands back a cursor when there is more', async () => {
    findMany.mockResolvedValue(['a', 'b', 'c'].map(row));
    const page = await getInStockRingsPage({ take: 2 });
    expect(findMany.mock.calls[0][0]).toMatchObject({ take: 3 });
    expect(findMany.mock.calls[0][0]).not.toHaveProperty('cursor');
    expect(page.rings.map((ring) => ring.slug)).toEqual(['a', 'b']);
    expect(page.nextCursor).toBe('b');
  });

  it('starts after the cursor and has no cursor on the last page', async () => {
    findMany.mockResolvedValue([row('c')]);
    const page = await getInStockRingsPage({ take: 2, cursor: 'b' });
    expect(findMany.mock.calls[0][0]).toMatchObject({ cursor: { id: 'b' }, skip: 1 });
    expect(page).toEqual({ rings: [expect.objectContaining({ slug: 'c' })] });
  });

  it('keeps a fixed order for rings with the same order and date', async () => {
    findMany.mockResolvedValue([]);
    await getInStockRingsPage();
    expect(findMany.mock.calls[0][0].orderBy.at(-1)).toEqual({ id: 'asc' });
  });
});

describe('getRingSummaries', () => {
  it('loads only what counting and ordering need', async () => {
    findMany.mockResolvedValue([{ id: '1', slug: 'a', createdAt: new Date(0), placeId: null }]);
    expect(await getRingSummaries()).toEqual([{ ...summary('a'), id: '1' }]);
    expect(Object.keys(findMany.mock.calls[0][0].select)).not.toContain('images');
  });
});

describe('isStillInShop', () => {
  const now = new Date('2026-11-24T12:00:00Z');
  const past = new Date('2026-11-24T11:59:00Z');
  const ahead = new Date('2026-11-24T12:01:00Z');

  it('keeps a listing without an end or a date', () => {
    expect(isStillInShop({ startsAt: null, expiresAt: null, submission: null }, now)).toBe(true);
    expect(isStillInShop({ startsAt: null, expiresAt: null, submission: { expiresAt: null } }, now)).toBe(true);
  });

  it("takes out a seller's listing once its submission's end has passed, as the database would", () => {
    expect(isStillInShop({ expiresAt: ahead, submission: { expiresAt: past } }, now)).toBe(false);
    expect(isStillInShop({ expiresAt: past, submission: { expiresAt: ahead } }, now)).toBe(true);
    expect(isStillInShop({ submission: { expiresAt: now } }, now)).toBe(false);
  });

  it("takes out an admin's service once its own end has passed", () => {
    expect(isStillInShop({ expiresAt: past, submission: null }, now)).toBe(false);
    expect(isStillInShop({ expiresAt: ahead, submission: null }, now)).toBe(true);
  });

  it('keeps an event all its day and takes it out the day after', () => {
    expect(isStillInShop({ startsAt: new Date('2026-11-24T08:00:00Z') }, now)).toBe(true);
    expect(isStillInShop({ startsAt: new Date('2026-11-23T20:00:00Z') }, now)).toBe(false);
  });
});

describe('rows cached before an end passed', () => {
  const ended = new Date(Date.now() - 60_000);
  const ahead = new Date(Date.now() + 60_000);

  it('leave the lists of listings at once', async () => {
    findMany.mockResolvedValue([
      { ...row('ended'), submission: { rawImages: [], expiresAt: ended, tags: [] } },
      { ...row('running'), submission: { rawImages: [], expiresAt: ahead, tags: [] } },
    ]);
    expect((await getInStockRings()).map((ring) => ring.slug)).toEqual(['running']);
  });

  it('leave the swipe to the next one and Hoy at once, with nothing extra handed on', async () => {
    findMany.mockResolvedValue([
      { id: '1', slug: 'ended', createdAt: new Date(0), placeId: null, type: 'PRODUCT', startsAt: null, expiresAt: ended, submission: null },
      { id: '2', slug: 'running', createdAt: new Date(0), placeId: null, type: 'PRODUCT', startsAt: null, expiresAt: null, submission: null },
    ]);
    expect(await getRingSummaries()).toEqual([{ id: '2', slug: 'running', createdAt: new Date(0), placeId: null }]);
    expect(await getTodayCandidates()).toEqual([{ createdAt: new Date(0), type: 'PRODUCT', startsAt: null, placeId: null }]);
  });
});

describe('findNextRing', () => {
  const summaries = [summary('a'), summary('b'), summary('c')];

  it('goes to the next listing in the order and round again after the last', () => {
    expect(findNextRing(summaries, 'a')).toBe('b');
    expect(findNextRing(summaries, 'c')).toBe('a');
  });

  it('has no next one when the listing is alone', () => {
    expect(findNextRing([summary('a')], 'a')).toBeUndefined();
  });
});
