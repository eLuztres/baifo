import { Metadata } from 'next';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import SubcategoryList from '@/components/admin/service/subcategory-list';
import { getSubcategories } from '@/lib/actions/category.actions';
import { requireAdmin } from '@/lib/auth-guard';
import type { LocalizedText } from '@/lib/category';
import { NEW_SERVICE_PATH, SERVICES_CATEGORY_SLUG } from '@/lib/constants';
import { getEnabledLocales, getShopLocale, getT } from '@/lib/i18n-server';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t('SUBCATEGORIES_TITLE') };
}

/** The kinds of service (subcategories of Servicios): admins add and rename them here. */
const SubcategoriesPage = async () => {
  await requireAdmin();
  const [{ t }, subcategories] = await Promise.all([getT(), getSubcategories(SERVICES_CATEGORY_SLUG)]);
  const shopLocale = getShopLocale();
  // The shop's language first: the link name of a new subcategory comes from it.
  const locales = [...getEnabledLocales()].sort((a, b) => Number(b === shopLocale) - Number(a === shopLocale));

  return (
    <div className='space-y-6'>
      <Link href={NEW_SERVICE_PATH} className='inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground'>
        <ChevronLeft className='size-4' /> {t('ADMIN_NEW_SERVICE')}
      </Link>
      <div className='space-y-2'>
        <h2 className='h2-bold'>{t('SUBCATEGORIES_TITLE')}</h2>
        <p className='max-w-2xl text-muted-foreground'>{t('SUBCATEGORIES_INTRO')}</p>
      </div>
      <SubcategoryList
        parentSlug={SERVICES_CATEGORY_SLUG}
        locales={locales}
        subcategories={subcategories.map(({ id, name }) => ({ id, name: name as LocalizedText }))}
      />
    </div>
  );
};

export default SubcategoriesPage;
