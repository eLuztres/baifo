// Separate from index.ts so client components can import it without pulling in server-only brand config.
// NEXT_PUBLIC_ because prices are also formatted in client components (needs a rebuild to change).
export const CURRENCY = process.env.NEXT_PUBLIC_CURRENCY || 'EUR';
export const NUMBER_LOCALE = process.env.NEXT_PUBLIC_NUMBER_LOCALE || 'de-DE';
