import type { CSSProperties } from 'react';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { BRAND } from '@/lib/brand';
import { OFFERS_PATH } from '@/lib/constants';
import { getT } from '@/lib/i18n-server';
import { getRunningOffers } from '@/lib/offers';
import { getShopPlaces } from '@/lib/places';
import { parsePlaceSlugs, PLACES_COOKIE } from '@/lib/places-core';
import BrandLogo from '@/components/shared/brand-logo';
import LanguageSwitcher from './language-switcher';
import ModeToggle from './mode-toggle';
import Menu from './menu';
import { getNavLinks } from './nav-items';
import NavLinks from './nav-links';
import PlacePicker from './place-picker';
import TabSwipe from './tab-swipe';

// The template (upstream) still imports it from here, so merges from it keep working.
export { getNavLinks };

const Header = async () => {
  const { t, locale } = await getT();
  const navLinks = getNavLinks(t);
  // A shop without places has no picker and shows everything.
  const [places, cookieStore, offers] = await Promise.all([getShopPlaces(locale), cookies(), getRunningOffers()]);
  // The offers page is in the bar only while an offer runs.
  const pageLinks = offers.length > 0 ? [{ href: OFFERS_PATH, label: t('OFFERS_TITLE') }] : [];

  // Blur only from lg up: on phones it re-blurs the moving page under it every frame, behind a nearly opaque background.
  return (
    <header className='sticky top-0 z-40 w-full border-b border-border bg-background lg:bg-background/95 lg:backdrop-blur'>
      <div className='flex h-16 w-full items-center justify-between gap-2 px-4 sm:gap-6 sm:h-20 sm:px-6 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:px-10'>
        <Link
          href='/'
          className='shrink-0 justify-self-start rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background'
          aria-label={BRAND.name}
          style={{ '--logo-height': `${BRAND.logoHeight}px` } as CSSProperties}
        >
          <BrandLogo withName priority isAnimated className='h-[calc(var(--logo-height)*0.75)] sm:h-(--logo-height)' nameClassName='text-2xl sm:text-3xl' />
        </Link>

        <NavLinks links={navLinks} pageLinks={pageLinks} />

        <div className='flex items-center gap-1 justify-self-end'>
          {places.length > 0 && <PlacePicker places={places} savedSlugs={parsePlaceSlugs(cookieStore.get(PLACES_COOKIE)?.value)} />}
          {/* A fixed start theme keeps its switch in the language menu: one header button less. */}
          <LanguageSwitcher variant='compact' className='hidden lg:inline-flex' hasThemeChoice={BRAND.hasThemeSwitch && BRAND.theme !== 'system'} />
          {BRAND.theme === 'system' && <ModeToggle className='hidden lg:inline-flex' />}
          <Menu />
        </div>
      </div>
      {BRAND.hasNavRow && <NavLinks links={navLinks} variant='row' />}
      <TabSwipe links={navLinks} />
    </header>
  );
};

export default Header;
