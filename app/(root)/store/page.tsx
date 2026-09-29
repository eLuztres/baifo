import type { Metadata } from 'next';
import ProductList from '@/components/shared/product/product-list';
import PageHeader from '@/components/shared/page-header';
import { getAllProducts } from '@/lib/actions/product.actions';
import { getT } from '@/lib/i18n-server';
import { convertToPlainObject } from '@/lib/utils';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t('NAV_SHOP') };
}

const StorePage = async () => {
  const { t } = await getT();
  const products = await getAllProducts({ query: 'all', page: 1 });

  return (
    <div className='space-y-12'>
      <PageHeader
        eyebrow={t('STORE_EYEBROW')}
        title={t('STORE_TITLE')}
        description={t('STORE_DESCRIPTION')}
      />
      <ProductList data={convertToPlainObject(products.data)} emptyMessage={t('STORE_EMPTY')} />
    </div>
  );
};

export default StorePage;
