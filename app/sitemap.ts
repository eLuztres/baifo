import type { MetadataRoute } from 'next';
import { getInStockSlugs } from '@/components/shared/home/in-stock-rings';
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

/** Home, the feed and every listing the shop shows; expired and sold ones drop out with it. Category pages only redirect to the feed. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const listings = await getInStockSlugs();

  return [
    entry('/'),
    entry('/explore'),
    ...listings.map((listing) => entry(`/product/${listing.slug}`, listing.createdAt)),
  ];
}
