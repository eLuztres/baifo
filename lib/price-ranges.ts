// The explore view's price ranges, as its link holds them (?precio=10-25, ?precio=500-).

export interface PriceRange {
  /** How the link names it: "0-10", "10-25", "500-". */
  value: string;
  min: number;
  /** None: no upper limit. */
  max?: number;
}

/** The ranges between the steps, from "up to the first" to "over the last"; steps out of order are sorted. */
export function priceRanges(steps: number[]): PriceRange[] {
  const sorted = [...new Set(steps)].filter((step) => step > 0).sort((a, b) => a - b);
  if (sorted.length === 0) return [];
  const bounds = [0, ...sorted];
  return [
    ...sorted.map((max, index) => ({ value: `${bounds[index]}-${max}`, min: bounds[index], max })),
    { value: `${sorted.at(-1)}-`, min: sorted.at(-1)! },
  ];
}

/** The range a link names; an unknown one counts as not chosen. */
export const parsePriceRange = (ranges: PriceRange[], param?: string) => ranges.find((range) => range.value === param);

/** Whether a price falls in the range: above its lower bound and up to its upper one, so 25 € is in "10 – 25 €" only.
    A listing without an amount is in none. */
export const isInPriceRange = (price: number | string | undefined, range: PriceRange) => {
  const amount = Number(price);
  return amount > 0 && amount > range.min && (range.max === undefined || amount <= range.max);
};
