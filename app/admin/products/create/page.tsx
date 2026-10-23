import { Metadata } from 'next';
import ProductForm from '@/components/admin/product-form';
import { getCategoryOptions } from '@/lib/actions/category.actions';
import { requireAdmin } from '@/lib/auth-guard';
import { PRICE_CLASSES } from '@/lib/constants';
import { getT } from '@/lib/i18n-server';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t('ADMIN_CREATE_PRODUCT') };
}

const CreateProductPage = async() => {
  await requireAdmin();
  const { t, locale } = await getT();
  const storeCategories = await getCategoryOptions(locale);
  return (
    <>
      <h2 className='h2-bold'>{t('ADMIN_CREATE_PRODUCT')}</h2>
      <div className='my-8'>
        <ProductForm type='Create' priceClasses={PRICE_CLASSES} storeCategories={storeCategories} />
      </div>
    </>
  );
};

export default CreateProductPage;
