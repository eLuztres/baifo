import { isInPriceRange, parsePriceRange, priceRanges } from '@/lib/price-ranges';

const RANGES = priceRanges([10, 25, 50, 100, 250, 500]);
const range = (value: string) => parsePriceRange(RANGES, value)!;

describe('priceRanges', () => {
  it('goes from "up to the first step" to "over the last"', () => {
    expect(RANGES.map((item) => item.value)).toEqual(['0-10', '10-25', '25-50', '50-100', '100-250', '250-500', '500-']);
    expect(range('500-')).toEqual({ value: '500-', min: 500 });
  });

  it('sorts the steps and drops repeats, zero and negatives', () => {
    expect(priceRanges([50, 10, 10, 0, -5]).map((item) => item.value)).toEqual(['0-10', '10-50', '50-']);
  });

  it('has no ranges without steps', () => {
    expect(priceRanges([])).toEqual([]);
  });
});

describe('parsePriceRange', () => {
  it('finds the range a link names', () => {
    expect(parsePriceRange(RANGES, '10-25')).toEqual({ value: '10-25', min: 10, max: 25 });
  });

  it('treats an unknown or missing range as not chosen', () => {
    expect(parsePriceRange(RANGES, '10-30')).toBeUndefined();
    expect(parsePriceRange(RANGES, 'barato')).toBeUndefined();
    expect(parsePriceRange(RANGES, undefined)).toBeUndefined();
  });
});

describe('isInPriceRange', () => {
  it('puts a price on a step in the lower range only, so no listing counts twice', () => {
    expect(isInPriceRange('25', range('10-25'))).toBe(true);
    expect(isInPriceRange('25', range('25-50'))).toBe(false);
    expect(RANGES.filter((item) => isInPriceRange('25.00', item))).toHaveLength(1);
  });

  it('counts every price in exactly one range', () => {
    for (const price of [0.5, 10, 10.01, 99.99, 500, 500.01, 12000]) {
      expect(RANGES.filter((item) => isInPriceRange(price, item))).toHaveLength(1);
    }
  });

  it('has no upper limit in the last range', () => {
    expect(isInPriceRange('12000', range('500-'))).toBe(true);
  });

  it('leaves a listing without an amount out of every range', () => {
    for (const price of [undefined, '0', '0.00', 'abc']) {
      expect(RANGES.some((item) => isInPriceRange(price, item))).toBe(false);
    }
  });
});
