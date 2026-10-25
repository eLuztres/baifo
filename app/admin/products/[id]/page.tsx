import ProductForm from '@/components/admin/product-form';
import { getProductById } from '@/lib/actions/product.actions';
import { getCategoryOptions } from '@/lib/actions/category.actions';
import { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth-guard';
import { PRICE_CLASSES } from '@/lib/constants';
import { getT } from '@/lib/i18n-server';
import { prisma } from '@/db/prisma';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t('ADMIN_UPDATE_PRODUCT') };
}

const AdminProductUpdatePage = async (props: {
  params: Promise<{
    id: string;
  }>;
}) => {
  await requireAdmin();
  const { id } = await props.params;

  const [{ t, locale }, product] = await Promise.all([getT(), getProductById(id)]);

  if (!product) return notFound();
  // A marketplace product is edited where it was made: the listing editor (pictures, texts, languages), not this form.
  const listing = await prisma.submission.findUnique({ where: { productId: id }, select: { id: true } });
  if (listing) redirect(`/admin/listings/${listing.id}`);
  const storeCategories = await getCategoryOptions(locale);

  return (
    <div className='space-y-8 max-w-5xl mx-auto'>
      <h1 className='h2-bold'>{t('ADMIN_UPDATE_PRODUCT')}</h1>

      <ProductForm
        type='Update'
        product={product}
        priceClasses={PRICE_CLASSES}
        storeCategories={storeCategories}
        previousImages={product.previousImages}
      />
    </div>
  );
};

export default AdminProductUpdatePage;
