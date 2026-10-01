import Link from 'next/link';
import { BRAND, hasContactInfo } from '@/lib/brand';
import type { Translator } from '@/lib/i18n';
import { getT } from '@/lib/i18n-server';
import BrandLogo from '@/components/shared/brand-logo';
import LanguageSwitcher from './language-switcher';
import ModeToggle from './mode-toggle';
import Menu from './menu';
import NavLinks from './nav-links';

export const getNavLinks = (t: Translator) => [
  { href: '/', label: t('NAV_HOME') },
  { href: '/store', label: t('NAV_SHOP') },
  ...(hasContactInfo ? [{ href: '/contact', label: t('NAV_CONTACT') }] : []),
];

const Header = async () => {
  const { t } = await getT();
  const navLinks = getNavLinks(t);

  return (
    <header className='sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur'>
      <div className='wrapper flex h-16 items-center justify-between gap-6 sm:h-20'>
        <Link
          href='/'
          className='shrink-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background'
          aria-label={BRAND.name}
        >
          <BrandLogo withName priority className='h-10 sm:h-12' />
        </Link>

        <NavLinks links={navLinks} />

        <div className='flex items-center gap-1'>
          <LanguageSwitcher variant='compact' className='hidden lg:inline-flex' />
          {BRAND.theme === 'system' && <ModeToggle />}
          <Menu navLinks={navLinks} menuLabel={t('NAV_MENU')} cartLabel={t('NAV_CART')} />
        </div>
      </div>
    </header>
  );
};

export default Header;
