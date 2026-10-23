import BrandLogo from '@/components/shared/brand-logo';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getT } from '@/lib/i18n-server';
import { SECTION_IDS, sectionHref } from '@/components/shared/home/one-page';

const NotFoundPage = async () => {
  const { t } = await getT();

  return (
    <div className='flex min-h-screen flex-col items-center justify-center gap-8 px-4 text-center'>
      <BrandLogo priority className='h-20' />
      <div className='space-y-3'>
        <p className='eyebrow'>404</p>
        <h1 className='text-4xl sm:text-5xl'>{t('NOT_FOUND_TITLE')}</h1>
        <p className='text-muted-foreground'>
          {t('NOT_FOUND_TEXT')}
        </p>
      </div>
      <div className='flex flex-wrap justify-center gap-3'>
        <Button asChild className='rounded-full px-7'>
          <Link href='/'>{t('NOT_FOUND_HOME')}</Link>
        </Button>
        <Button asChild variant='outline' className='rounded-full px-7'>
          <Link href={sectionHref(SECTION_IDS.showroom)}>{t('NOT_FOUND_SHOP')}</Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFoundPage;
