import type { ListingType } from '@/lib/constants';
import { composeFeed, type FeedEntry } from '@/lib/feed';

interface Entry extends FeedEntry {
  id: string;
}

const entry = (id: string, category: string, type: ListingType = 'PRODUCT'): Entry => ({ id, categoryIds: [category], type });

const many = (prefix: string, category: string, count: number, type: ListingType = 'PRODUCT') =>
  Array.from({ length: count }, (_, i) => entry(`${prefix}${i}`, category, type));

const isService = (item: Entry) => item.type === 'SERVICE';

// Services sit in any category now, like the goods.
const entries = [...many('c', 'casa', 12), ...many('m', 'moda', 12), ...many('e', 'electronica', 12), ...many('s', 'clases', 8, 'SERVICE')];

describe('composeFeed', () => {
  it('keeps every entry exactly once', () => {
    const feed = composeFeed(entries, 'moda', 'seed');
    expect(feed).toHaveLength(entries.length);
    expect(new Set(feed.map((item) => item.id)).size).toBe(entries.length);
  });

  it("opens with the visitor's category in the shop's order", () => {
    const feed = composeFeed(entries, 'moda', 'seed');
    expect(feed.slice(0, 6).map((item) => item.id)).toEqual(['m0', 'm1', 'm2', 'm3', 'm4', 'm5']);
  });

  it('mixes services in after the opening, not before', () => {
    const feed = composeFeed(entries, 'casa', 'seed');
    const firstService = feed.findIndex(isService);
    expect(firstService).toBeGreaterThanOrEqual(6);
    expect(firstService).toBeLessThan(entries.length - 8);
  });

  it('never shows two services in a row while there are products left', () => {
    for (const seed of ['a', 'b', 'c', 'd']) {
      const feed = composeFeed(entries, undefined, seed);
      const lastProduct = feed.findLastIndex((item) => !isService(item));
      const pairs = feed.slice(0, lastProduct).filter((item, i, list) => isService(item) && i + 1 < list.length && isService(list[i + 1]));
      expect(pairs).toEqual([]);
    }
  });

  it('gives the same order for the same seed and another for another seed', () => {
    const ids = (seed: string) => composeFeed(entries, undefined, seed).map((item) => item.id);
    expect(ids('2026-10-25')).toEqual(ids('2026-10-25'));
    expect(ids('2026-10-25')).not.toEqual(ids('2026-10-26'));
  });

  it('keeps the order inside a category', () => {
    const casa = composeFeed(entries, undefined, 'seed').filter((item) => item.categoryIds[0] === 'casa');
    expect(casa.map((item) => item.id)).toEqual(many('c', 'casa', 12).map((item) => item.id));
  });

  it('works with an unknown category, an empty shop and only services', () => {
    expect(composeFeed(entries, 'nope', 'seed')).toHaveLength(entries.length);
    expect(composeFeed([], 'casa', 'seed')).toEqual([]);
    expect(composeFeed(many('s', 'clases', 3, 'SERVICE'), undefined, 'seed')).toHaveLength(3);
  });
});
