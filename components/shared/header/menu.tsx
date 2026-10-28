import { Suspense } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { MenuIcon } from 'lucide-react';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { OFFERS_PATH, SHOWCASE_MODE } from '@/lib/constants';
import { BRAND } from '@/lib/brand';
import { getT } from '@/lib/i18n-server';
import { getRunningOffers } from '@/lib/offers';
import UserButton from './user-button';
import LanguageSwitcher from './language-switcher';
import ModeToggle from './mode-toggle';
import MenuAccount, { MENU_ROW_CLASS } from './menu-account';
import CartButton, { CartLink } from './cart-button';
import { getNavLinks } from './nav-items';

// The shop, admin and account headers all render it, so it translates its own links and labels.
const Menu = async () => {
  const [{ t }, offers] = await Promise.all([getT(), getRunningOffers()]);
  const navLinks = getNavLinks(t);
  const hasOffers = offers.length > 0;
  const menuLabel = t('NAV_MENU');
  const cartLabel = t('NAV_CART');

  return (
    <div className='flex items-center gap-2'>
      {!SHOWCASE_MODE && (
        <Suspense fallback={<CartLink label={cartLabel} />}>
          <CartButton label={cartLabel} />
        </Suspense>
      )}

      <div className='hidden lg:block'>
        <UserButton />
      </div>

      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant='ghost'
            size='icon'
            className='rounded-full lg:hidden'
            aria-label={menuLabel}
          >
            <MenuIcon className='!size-5' />
          </Button>
        </SheetTrigger>
        {/* The sheet has a title but no description; this tells Radix that is on purpose. */}
        <SheetContent className='flex flex-col gap-6 overflow-y-auto' aria-describedby={undefined}>
          <SheetTitle className='font-display text-2xl'>{menuLabel}</SheetTitle>
          <LanguageSwitcher />
          {BRAND.hasThemeSwitch && <ModeToggle variant='pills' hasSystem={BRAND.theme === 'system'} />}
          <nav className='flex flex-col gap-1'>
            {navLinks.map((link) => (
              <SheetClose asChild key={link.href}>
                <Link
                  href={link.href}
                  className={MENU_ROW_CLASS}
                >
                  {link.label}
                </Link>
              </SheetClose>
            ))}
            {hasOffers && (
              <SheetClose asChild>
                <Link href={OFFERS_PATH} className={MENU_ROW_CLASS}>
                  {t('OFFERS_TITLE')}
                </Link>
              </SheetClose>
            )}
          </nav>
          {/* Every account link sits right in the menu: a second dropdown inside the sheet was cramped on phones. */}
          <div className='border-t pt-4'>
            <MenuAccount />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default Menu;
