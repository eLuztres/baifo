// Separate from index.ts so client components can import it without pulling in server-only brand config.
// NEXT_PUBLIC_ because prices and dates are also formatted in client components (needs a rebuild to change).
export const CURRENCY = process.env.NEXT_PUBLIC_CURRENCY || 'EUR';
export const NUMBER_LOCALE = process.env.NEXT_PUBLIC_NUMBER_LOCALE || 'de-DE';

const DEFAULT_TIME_ZONE = 'Europe/Madrid';

// A typo in the env var would make every date format throw, so fall back instead.
function readTimeZone(value: string | undefined) {
  if (!value) return DEFAULT_TIME_ZONE;
  try {
    new Intl.DateTimeFormat('en', { timeZone: value });
    return value;
  } catch {
    return DEFAULT_TIME_ZONE;
  }
}

// Fixed, so the server (UTC on Vercel) and the browser render the same date text.
export const SHOP_TIME_ZONE = readTimeZone(process.env.NEXT_PUBLIC_SHOP_TIME_ZONE?.trim());
