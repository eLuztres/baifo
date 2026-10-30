/** Fewer listings than this look lonely: a row this thin goes into one mixed row, a page this thin gets more below. */
export const MIN_FULL_LISTINGS = 4;

interface ExploreRowData<T extends { id: string }> {
  key: string;
  title: string;
  href: string;
  listings: T[];
}

/** The full rows as they are, and the listings of the thin ones gathered once each, for a single mixed row. */
export function splitThinRows<R extends ExploreRowData<{ id: string }>>(rows: R[]) {
  const fullRows = rows.filter((row) => row.listings.length >= MIN_FULL_LISTINGS);
  const thinListings: R['listings'][number][] = rows.filter((row) => row.listings.length < MIN_FULL_LISTINGS).flatMap((row) => row.listings);
  const mixedListings = [...new Map(thinListings.map((listing) => [listing.id, listing])).values()];
  return { fullRows, mixedListings };
}

/** Other live listings to show after a thin choice, so its page never ends after a card or two; none once it's full. */
export const moreListingsFor = <T extends { id: string }>(chosen: T[], all: T[], max: number): T[] =>
  chosen.length >= MIN_FULL_LISTINGS ? [] : all.filter((listing) => !chosen.some((own) => own.id === listing.id)).slice(0, max);

/** The categories after the chosen one in the ring's order, around to the one before it, each with its listings not shown yet:
    a category's page scrolls on into the next ones. Empty categories are left out. */
export function followingCategories<C extends { id: string }, T extends { id: string }>(
  categories: C[],
  chosenId: string,
  listingsOf: (category: C) => T[],
  shown: T[]
) {
  const index = categories.findIndex((category) => category.id === chosenId);
  const seenIds = new Set(shown.map((listing) => listing.id));
  return [...categories.slice(index + 1), ...categories.slice(0, Math.max(index, 0))]
    .map((category) => {
      const listings = listingsOf(category).filter((listing) => !seenIds.has(listing.id));
      listings.forEach((listing) => seenIds.add(listing.id));
      return { category, listings };
    })
    .filter(({ listings }) => listings.length > 0);
}
