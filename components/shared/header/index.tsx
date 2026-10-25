import Link from 'next/link';
import { BRAND } from '@/lib/brand';
import { getT } from '@/lib/i18n-server';
import BrandLogo from '@/components/shared/brand-logo';
import LanguageSwitcher from './language-switcher';
import ModeToggle from './mode-toggle';
import Menu from './menu';
import { getNavLinks } from './nav-items';
import NavLinks from './nav-links';
import TabSwipe from './tab-swipe';

// The template (upstream) still imports it from here, so merges from it keep working.
export { getNavLinks };

const Header = async () => {
  const { t } = await getT();
  const navLinks = getNavLinks(t);

  // Blur only from lg up: on phones it re-blurs the moving page under it every frame, behind a nearly opaque background.
  return (
    <header className='sticky top-0 z-40 w-full border-b border-border bg-background lg:bg-background/95 lg:backdrop-blur'>
      <div className='flex h-16 w-full items-center justify-between gap-6 px-4 sm:h-20 sm:px-6 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:px-10'>
        <Link
          href='/'
          className='shrink-0 justify-self-start rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background'
          aria-label={BRAND.name}
        >
          <BrandLogo withName priority className='h-12 sm:h-16' nameClassName='text-2xl sm:text-3xl' />
        </Link>

        <NavLinks links={navLinks} />

        <div className='flex items-center gap-1 justify-self-end'>
          <LanguageSwitcher variant='compact' className='hidden lg:inline-flex' />
          {BRAND.theme === 'system' && <ModeToggle />}
          <Menu />
        </div>
      </div>
      {BRAND.hasNavRow && <NavLinks links={navLinks} variant='row' />}
      <TabSwipe links={navLinks} />
    </header>
  );
};

export default Header;
