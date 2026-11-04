import type { Metadata } from 'next';
import { BRAND } from '@/lib/brand';
import { APP_NAME, SERVER_URL } from '@/lib/constants';
import { getDictionary } from '@/lib/i18n';
import { getShopLocale, getT } from '@/lib/i18n-server';
import { jsonLd, pageAlternates, shopJsonLd } from '@/lib/seo';
import HomePage from './home-page';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return {
    title: { absolute: t('HOME_SEO_TITLE', { shop: APP_NAME }) },
  };
}

export default async function Page() {
  const description = getDictionary(getShopLocale()).BRAND_DESCRIPTION || BRAND.description;
  const { canonical, languages } = await pageAlternates('/');
  return (
    <>
      {/* Not in the metadata: Next drops the query from the root's URLs, so every language would claim to be the shop's own. */}
      <link rel='canonical' href={`${SERVER_URL}${canonical}`} />
      {Object.entries(languages).map(([language, href]) => (
        <link key={language} rel='alternate' hrefLang={language} href={`${SERVER_URL}${href}`} />
      ))}
      {/* Safe: jsonLd escapes `<`, and the data comes from the shop's own configuration. */}
      <script type='application/ld+json' dangerouslySetInnerHTML={{ __html: jsonLd(shopJsonLd(description)) }} />
      <HomePage />
    </>
  );
}
