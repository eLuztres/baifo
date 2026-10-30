import { prisma } from '@/db/prisma';
import {
  getInStockRings,
  getInStockRingsPage,
  getRingSummaries,
  type RingSummary,
} from '@/components/shared/home/in-stock-rings';
import { findNextRing, orderByCategory, pickShowroomRings, RING_PREVIEW_COUNT } from '@/components/shared/home/materials';

jest.mock('@/db/prisma', () => ({ prisma: { product: { findMany: jest.fn() } } }));

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
  expiresAt: null,
  categories: [{ id: 'c1' }],
  submission: null,
});

const summary = (slug: string, categoryIds: string[], createdAt = new Date(0)): RingSummary => ({
  id: `id-${slug}`,
  slug,
  createdAt,
  placeId: null,
  categoryIds,
});

const CATEGORIES = [
  { id: 'c1', slug: 'lava' },
  { id: 'c2', slug: 'wood' },
  { id: 'c3', slug: 'carbon' },
];

beforeEach(() => findMany.mockReset());

describe('getInStockRings', () => {
  it('loads every ring in stock, with no cap', async () => {
    findMany.mockResolvedValue([row('a')]);
    const rings = await getInStockRings();
    const args = findMany.mock.calls[0][0];
    expect(args.take).toBeUndefined();
    expect(args.where).toHaveProperty('images');
    expect(rings[0]).toMatchObject({ slug: 'a', image: '/a.jpg', categoryIds: ['c1'], isReserved: false });
  });

  it("ends a seller's listing with its submission and an admin's with its own end", async () => {
    const submissionEnd = new Date('2026-11-01T00:00:00Z');
    const productEnd = new Date('2026-12-01T00:00:00Z');
    findMany.mockResolvedValue([
      { ...row('seller'), expiresAt: productEnd, submission: { rawImages: [], expiresAt: submissionEnd } },
      { ...row('admin'), expiresAt: productEnd },
      row('forever'),
    ]);
    const rings = await getInStockRings();
    expect(rings.map((ring) => ring.endsAt)).toEqual([submissionEnd, productEnd, null]);
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
    findMany.mockResolvedValue([{ id: '1', slug: 'a', createdAt: new Date(0), placeId: null, categories: [{ id: 'c1' }] }]);
    expect(await getRingSummaries()).toEqual([summary('a', ['c1'])].map((ring) => ({ ...ring, id: '1' })));
    expect(Object.keys(findMany.mock.calls[0][0].select)).not.toContain('images');
  });
});

describe('pickShowroomRings', () => {
  it("loads each category's first few and the extra slugs, and counts all of them", () => {
    const lava = Array.from({ length: RING_PREVIEW_COUNT + 2 }, (_, index) => summary(`l${index}`, ['c1']));
    const fresh = summary('w', ['c2'], new Date());
    const lastLava = `l${RING_PREVIEW_COUNT + 1}`;
    const { ids, counts } = pickShowroomRings(CATEGORIES, [...lava, fresh], new Set([lastLava]));

    expect(ids).toEqual([`id-${lastLava}`, ...lava.slice(0, RING_PREVIEW_COUNT).map((ring) => ring.id), 'id-w']);
    expect(counts.get('lava')).toEqual({ count: RING_PREVIEW_COUNT + 2, newCount: 0 });
    expect(counts.get('wood')).toEqual({ count: 1, newCount: 1 });
    expect(counts.get('carbon')).toEqual({ count: 0, newCount: 0 });
  });
});

describe('findNextRing over the light order', () => {
  const summaries = [summary('a', ['c1', 'c2']), summary('b', ['c1']), summary('c', ['c2'])];
  const groups = orderByCategory(CATEGORIES, summaries);

  it('skips empty categories', () => {
    expect(groups.map((group) => group.id)).toEqual(['lava', 'wood']);
  });

  it('goes to the next ring in the category the visitor came through, then on to the next category and round', () => {
    expect(findNextRing(groups, 'a', 'lava')).toEqual({ slug: 'b', categoryId: 'lava' });
    expect(findNextRing(groups, 'a', 'wood')).toEqual({ slug: 'c', categoryId: 'wood' });
    expect(findNextRing(groups, 'c', 'wood')).toEqual({ slug: 'a', categoryId: 'lava' });
  });
});
