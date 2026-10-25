import type { Metadata } from 'next';
import { BRAND } from '@/lib/brand';
import { APP_NAME } from '@/lib/constants';
import { getDictionary } from '@/lib/i18n';
import { getShopLocale, getT } from '@/lib/i18n-server';
import { jsonLd, pageAlternates, shopJsonLd } from '@/lib/seo';
import HomePage from './home-page';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return {
    title: { absolute: t('HOME_SEO_TITLE', { shop: APP_NAME }) },
    alternates: await pageAlternates('/'),
  };
}

export default function Page() {
  const description = getDictionary(getShopLocale()).BRAND_DESCRIPTION || BRAND.description;
  return (
    <>
      {/* Safe: jsonLd escapes `<`, and the data comes from the shop's own configuration. */}
      <script type='application/ld+json' dangerouslySetInnerHTML={{ __html: jsonLd(shopJsonLd(description)) }} />
      <HomePage />
    </>
  );
}
