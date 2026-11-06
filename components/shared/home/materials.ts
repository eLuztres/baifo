/** The listing after `slug` in the store's order, starting over after the last one. */
export function findNextRing(rings: { slug: string }[], slug: string): string | undefined {
  const index = rings.findIndex((ring) => ring.slug === slug);
  for (let step = 1; step <= rings.length; step++) {
    const next = rings[(index + step) % rings.length];
    if (next.slug !== slug) return next.slug;
  }
  return undefined;
}
