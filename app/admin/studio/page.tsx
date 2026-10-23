import { Metadata } from 'next';
import ProductStudio from '@/components/admin/product-studio';
import { getAllCategories } from '@/lib/actions/product.actions';
import { getCategoryOptions } from '@/lib/actions/category.actions';
import { requireAdmin } from '@/lib/auth-guard';
import { IS_STUDIO_ENABLED } from '@/lib/constants';
import { redirect } from 'next/navigation';
import { BRAND } from '@/lib/brand';
import { getT } from '@/lib/i18n-server';

// Each AI picture takes 30–90 s; the studio's server actions inherit this limit.
export const maxDuration = 300;

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t('STUDIO_TITLE') };
}

interface StudioPageProps {
  /** The store category to start with (its id), from the "add a ring" button on the store's ring. */
  searchParams: Promise<{ category?: string }>;
}

const StudioPage = async ({ searchParams }: StudioPageProps) => {
  await requireAdmin();
  if (!IS_STUDIO_ENABLED) redirect('/admin/products/create');
  const [{ t, locale }, categoryCounts, { category }] = await Promise.all([getT(), getAllCategories(), searchParams]);
  const storeCategories = await getCategoryOptions(locale);
  // Prisma types a groupBy result loosely; each entry does carry its category.
  const categories = (categoryCounts as { category: string }[]).map((entry) => entry.category);

  return (
    <div className='space-y-8'>
      <div className='space-y-2'>
        <h2 className='h2-bold'>{t('STUDIO_TITLE')}</h2>
        <p className='max-w-2xl text-muted-foreground'>{t('STUDIO_INTRO')}</p>
      </div>
      <ProductStudio
        categories={categories}
        brand={BRAND.name}
        storeCategories={storeCategories}
        initialStoreCategoryId={storeCategories.some(({ id }) => id === category) ? category : undefined}
      />
    </div>
  );
};

export default StudioPage;
