import BrandLogo from '@/components/shared/brand-logo';
import Link from 'next/link';
import Menu from '@/components/shared/header/menu';
import MainNav from './main-nav';
import AdminSearch from '@/components/admin/admin-search';
import { NEW_PRODUCT_PATH, SHOWCASE_MODE } from '@/lib/constants';
import { ADMIN_LINKS } from '@/lib/brand';
import { localize } from '@/lib/category';
import { getLocale } from '@/lib/i18n-server';

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const extraLinks = ADMIN_LINKS.map(({ href, label }) => ({ href, label: localize(label, locale) }));
  return (
    <>
      <div className='flex flex-col'>
        <div className='border-b container mx-auto'>
          <div className='flex items-center h-16 px-4'>
            <Link href='/'>
              <BrandLogo />
            </Link>
            <MainNav className='mx-6' isShowcase={SHOWCASE_MODE} newProductHref={NEW_PRODUCT_PATH} extraLinks={extraLinks} />
            <div className='ml-auto items-center flex space-x-4'>
              <AdminSearch />
              <Menu />
            </div>
          </div>
        </div>

        <div className='flex-1 space-y-4 p-8 pt-6 container mx-auto'>
          {children}
        </div>
      </div>
    </>
  );
}
