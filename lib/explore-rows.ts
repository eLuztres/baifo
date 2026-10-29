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
