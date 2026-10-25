import { Metadata } from 'next';
import Link from 'next/link';
import ServiceWizard from '@/components/admin/service-wizard';
import { getSubcategories } from '@/lib/actions/category.actions';
import { requireAdmin } from '@/lib/auth-guard';
import { localize } from '@/lib/category';
import { SERVICES_CATEGORY_SLUG } from '@/lib/constants';
import { getT } from '@/lib/i18n-server';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t('ADMIN_NEW_SERVICE') };
}

const NewServicePage = async () => {
  await requireAdmin();
  const [{ t, locale }, subcategories] = await Promise.all([getT(), getSubcategories(SERVICES_CATEGORY_SLUG)]);

  return (
    <div className='space-y-8'>
      <div className='space-y-2'>
        <h2 className='h2-bold'>{t('ADMIN_NEW_SERVICE')}</h2>
        <p className='max-w-2xl text-muted-foreground'>{t('SERVICE_INTRO')}</p>
        <Link href='/admin/services/subcategories' className='inline-block text-sm text-primary underline-offset-4 hover:underline'>
          {t('SUBCATEGORIES_MANAGE')}
        </Link>
      </div>
      <ServiceWizard subcategories={subcategories.map(({ id, name }) => ({ id, name: localize(name, locale) }))} />
    </div>
  );
};

export default NewServicePage;
