import BrandLogo from '@/components/shared/brand-logo';
import Link from 'next/link';
import { Store } from 'lucide-react';
import Menu from '@/components/shared/header/menu';
import { Button } from '@/components/ui/button';
import MainNav from './main-nav';
import { APP_NAME, IS_STUDIO_ENABLED, NEW_PRODUCT_PATH, OFFERS_ENABLED, SHOWCASE_MODE } from '@/lib/constants';
import { ADMIN_LINKS } from '@/lib/brand';
import { localize } from '@/lib/category';
import { getLocale, getT } from '@/lib/i18n-server';

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [locale, { t }] = await Promise.all([getLocale(), getT()]);
  const navProps = { isShowcase: SHOWCASE_MODE, isAiEnabled: IS_STUDIO_ENABLED, isOffersEnabled: OFFERS_ENABLED, newProductHref: NEW_PRODUCT_PATH };
  const extraLinks = ADMIN_LINKS.map(({ href, label }) => ({ href, label: localize(label, locale) }));
  return (
    <>
      <div className='flex flex-col'>
        {/* Stays in reach while scrolling; on a phone the admin pages get their own row of tabs under it. */}
        <header className='sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur-md'>
          <div className='container mx-auto flex h-12 items-center gap-3 px-4 sm:h-16'>
            <Link href='/' className='shrink-0'>
              <BrandLogo className='h-8 sm:h-10' />
            </Link>
            <MainNav className='mx-6 hidden lg:flex' {...navProps} extraLinks={extraLinks} />
            <div className='ml-auto flex items-center gap-2'>
              {/* The way back to the shop is always in sight, also on a phone. */}
              <Button asChild variant='outline' size='sm' className='h-8 rounded-full text-xs sm:h-9 sm:text-sm'>
                <Link href='/'>
                  {/* The smallest phones get the icon only, so longer languages (German) fit next to the logo. */}
                  <Store /> <span className='max-[359px]:sr-only'>{t('ADMIN_BACK_TO_SHOP', { shop: APP_NAME })}</span>
                </Link>
              </Button>
              <Menu />
            </div>
          </div>
          <MainNav
            variant='tabs'
            className='overflow-x-auto px-4 pb-2 [scrollbar-width:none] lg:hidden'
            {...navProps}
            extraLinks={extraLinks}
          />
        </header>

        <div className='container mx-auto flex-1 space-y-4 px-4 py-3 sm:p-8 sm:pt-6'>
          {children}
        </div>
      </div>
    </>
  );
}
