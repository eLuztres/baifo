/** What the feed needs to know to place an entry. */
export interface FeedEntry {
  categoryIds: string[];
  isService: boolean;
}

/** How many entries of the visitor's category open the feed before others mix in. */
const INTRO_LENGTH = 6;

// A small seeded random generator: the same seed gives the same feed, so the order stays put on reload and back.
function seededRandom(seed: string) {
  let state = [...seed].reduce((hash, char) => Math.imul(hash ^ char.charCodeAt(0), 16777619), 2166136261) >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

const groupOf = (entry: FeedEntry) => entry.categoryIds[0] ?? '';

/**
 * The marketplace feed: the visitor's category first, then the other categories and the services
 * woven in more and more, never two of the same category in a row when it can be helped.
 * Entries keep their incoming order (the shop's order) inside their own category.
 */
export function composeFeed<T extends FeedEntry>(entries: T[], focusCategoryId: string | undefined, seed: string): T[] {
  const random = seededRandom(seed);
  const focus = focusCategoryId ? entries.filter((entry) => entry.categoryIds.includes(focusCategoryId)) : [];
  const rest = entries.filter((entry) => !focus.includes(entry));
  const services = shuffle(rest.filter((entry) => entry.isService), random);

  const groups = new Map<string, T[]>();
  for (const entry of rest.filter((item) => !item.isService)) {
    groups.set(groupOf(entry), [...(groups.get(groupOf(entry)) ?? []), entry]);
  }
  const goods = shuffle([...groups.values()], random);

  const feed = focus.splice(0, INTRO_LENGTH);
  while (focus.length + services.length + goods.length > 0) {
    const step = feed.length;
    const previous = feed.length > 0 ? feed[feed.length - 1] : undefined;
    const previousGroup = previous && groupOf(previous);
    const goodsLeft = goods.reduce((sum, group) => sum + group.length, 0);
    // Weighted by what is left, so everything spreads over the whole feed; the visitor's category
    // starts strong and fades, services ramp up from nothing and never come twice in a row.
    const weights: number[] = [
      focus.length * Math.max(0.3, 2 - step * 0.08) * (previous && focusCategoryId && previous.categoryIds.includes(focusCategoryId) ? 0.5 : 1),
      previous?.isService && focus.length + goodsLeft > 0 ? 0 : services.length * Math.min(1, step * 0.08),
      goodsLeft,
    ];
    // Only services left at the very start: the ramp would weigh them 0.
    if (!weights.some((weight) => weight > 0)) weights[1] = services.length;
    let pick = random() * weights.reduce((sum, weight) => sum + weight, 0);
    let source = weights.findIndex((weight) => weight > 0 && (pick -= weight) < 0);
    // Rounding can leave the pick just past the end: then the last source that has entries takes it.
    if (source === -1) source = weights.length - 1 - [...weights].reverse().findIndex((weight) => weight > 0);

    if (source === 0) feed.push(focus.shift()!);
    else if (source === 1) feed.push(services.shift()!);
    else {
      const index = Math.max(0, goods.findIndex((group) => groupOf(group[0]) !== previousGroup));
      feed.push(goods[index].shift()!);
      // Round-robin: the category just shown goes to the back of the line.
      const [group] = goods.splice(index, 1);
      if (group.length > 0) goods.push(group);
    }
  }
  return feed;
}
