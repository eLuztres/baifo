import type { MetadataRoute } from 'next';
import { getInStockSlugs, getRingSummaries } from '@/components/shared/home/in-stock-rings';
import { getStoreCategories } from '@/lib/actions/category.actions';
import { SERVER_URL } from '@/lib/constants';
import { languageAlternates } from '@/lib/seo';

// Listings come and go all day: rebuilt at most once an hour instead of frozen at build time.
export const revalidate = 3600;

const absolute = (languages: Record<string, string>) =>
  Object.fromEntries(Object.entries(languages).map(([locale, path]) => [locale, `${SERVER_URL}${path}`]));

const entry = (path: string, lastModified?: Date): MetadataRoute.Sitemap[number] => ({
  url: `${SERVER_URL}${path}`,
  lastModified,
  alternates: { languages: absolute(languageAlternates(path)) },
});

/** Home, the feed, each category with listings and every listing the shop shows; expired and sold ones drop out with it. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [listings, summaries, categories] = await Promise.all([getInStockSlugs(), getRingSummaries(), getStoreCategories()]);
  const filled = categories.filter((category) => summaries.some((listing) => listing.categoryIds.includes(category.id)));

  return [
    entry('/'),
    entry('/explore'),
    ...filled.map((category) => entry(`/explore?categoria=${category.slug}`)),
    ...listings.map((listing) => entry(`/product/${listing.slug}`, listing.createdAt)),
  ];
}
