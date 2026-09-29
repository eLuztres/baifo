import Link from 'next/link';
import { BRAND, hasContactInfo } from '@/lib/brand';
import type { Translator } from '@/lib/i18n';
import { getT } from '@/lib/i18n-server';
import BrandLogo from '@/components/shared/brand-logo';
import LanguageSwitcher from './language-switcher';
import ModeToggle from './mode-toggle';
import Menu from './menu';

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
        <Link href='/' className='shrink-0' aria-label={BRAND.name}>
          <BrandLogo withName priority className='h-9 sm:h-11' />
        </Link>

        <nav className='hidden items-center gap-1 lg:flex'>
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className='rounded-full px-4 py-2 text-[15px] text-foreground/75 transition hover:bg-muted hover:text-foreground'
            >
              {link.label}
            </Link>
          ))}
        </nav>

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
