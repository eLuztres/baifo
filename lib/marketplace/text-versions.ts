import type { Locale } from '@/lib/i18n-core';

// No server imports: the editor in the browser uses these too.

/** Which text a listing uses: the admin's own words, only translated; the same with only their mistakes fixed; or the
    text the AI improved. */
export const TEXT_MODES = ['original', 'corrected', 'ai'] as const;
export type TextMode = (typeof TEXT_MODES)[number];

/** A title and description in each language. */
export type ListingTexts = Partial<Record<Locale, { title: string; description: string; short?: string }>>;

/** Each text of a listing in every shop language (Submission.textVersions). */
export type TextVersions = Partial<Record<TextMode, ListingTexts>>;
