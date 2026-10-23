// "25€", "25 euros", "precio 25", "€ 12,50": the first amount that is clearly a price.
const PRICE_PATTERNS = [
  /(\d{1,6}(?:[.,]\d{1,2})?)\s*(?:€|eur\b|euros?\b)/i,
  /(?:€|eur\b)\s*(\d{1,6}(?:[.,]\d{1,2})?)/i,
  /(?:precio|price|pido|vendo por)\s*:?\s*(\d{1,6}(?:[.,]\d{1,2})?)/i,
];

/** The price a seller wrote, as a fixed-2 string, or null when the text names none. */
export function parsePrice(text: string): string | null {
  for (const pattern of PRICE_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      const value = Number(match[1].replace(',', '.'));
      if (value > 0) return value.toFixed(2);
    }
  }
  return null;
}
