'use client';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { CREATING_PARAM } from '@/lib/constants';
import React, { useEffect, useRef } from 'react';
import { useI18n } from '@/components/i18n-provider';
import type { TranslationKey } from '@/lib/i18n-core';

// New product comes first: adding products is what the admin does most.
const links: { title: TranslationKey; href: string; isSalesOnly?: boolean; isAiOnly?: boolean; isOffersOnly?: boolean }[] = [
  {
    title: 'ADMIN_NEW_PRODUCT',
    href: '/admin/studio',
  },
  {
    title: 'ADMIN_PRODUCTS',
    href: '/admin/products',
  },
  {
    title: 'ADMIN_OVERVIEW',
    href: '/admin/overview',
    isSalesOnly: true,
  },
  {
    title: 'ORDERS_TITLE',
    href: '/admin/orders',
    isSalesOnly: true,
  },
  {
    title: 'OFFERS_ADMIN_TITLE',
    href: '/admin/offers',
    isOffersOnly: true,
  },
  {
    title: 'ADMIN_USERS',
    href: '/admin/users',
  },
  {
    title: 'ADMIN_AI_COSTS',
    href: '/admin/ai-costs',
    isAiOnly: true,
  },
];

interface MainNavProps extends React.HTMLAttributes<HTMLElement> {
  /** Showcase shops sell nothing online, so sales figures and orders stay out of the menu. */
  isShowcase: boolean;
  /** Whether the shop has an OpenAI key; without one there are no AI costs to show. */
  isAiEnabled: boolean;
  /** Whether the shop has offers (OFFERS_ENABLED). */
  isOffersEnabled: boolean;
  /** Where "New product" leads (NEW_PRODUCT_PATH). */
  newProductHref: string;
  /** The shop's own admin pages (brand/admin-links.json), already in the visitor's language. */
  extraLinks?: { href: string; label: string }[];
  /** `tabs`: a row of pills that scrolls sideways (phones); `inline`: plain links in the header bar. */
  variant?: 'inline' | 'tabs';
}

// The active page is lit: in the bar by its color, as a tab by a filled pill.
const linkClass = (variant: 'inline' | 'tabs', isActive: boolean) =>
  variant === 'tabs'
    ? cn(
        'shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
        isActive ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-muted-foreground hover:text-foreground'
      )
    : cn('text-sm font-medium transition-colors hover:text-primary', !isActive && 'text-muted-foreground');

const MainNav = ({ className, isShowcase, isAiEnabled, isOffersEnabled, newProductHref, extraLinks = [], variant = 'inline', ...props }: MainNavProps) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // A listing just made on the creation page is still being created on its own page.
  const isCreating = pathname.includes(newProductHref) || searchParams.has(CREATING_PARAM);
  const { t } = useI18n();
  const navRef = useRef<HTMLElement>(null);
  // A row of tabs wider than the phone: the current page's tab slides into view.
  useEffect(() => {
    if (variant === 'tabs') navRef.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ inline: 'center', block: 'nearest' });
  }, [pathname, variant]);
  return (
    <nav
      ref={navRef}
      className={cn('flex items-center', variant === 'tabs' ? 'gap-1.5' : 'space-x-4 lg:space-x-6', className)}
      {...props}
    >
      {links.filter((item) => !(isShowcase && item.isSalesOnly) && !(!isAiEnabled && item.isAiOnly) && !(!isOffersEnabled && item.isOffersOnly)).map((item) => {
        const href = item.href === '/admin/studio' ? newProductHref : item.href;
        const isActive = href === newProductHref ? isCreating : pathname.includes(href);
        return (
          <Link
            key={item.href}
            href={href}
            aria-current={isActive ? 'page' : undefined}
            className={linkClass(variant, isActive)}
          >
            {t(item.title)}
          </Link>
        );
      })}
      {extraLinks.map((link) => {
        // The shop's own creation flow may sit under one of its links (e.g. /admin/listings/new).
        const isActive = pathname.startsWith(link.href) && !isCreating;
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={isActive ? 'page' : undefined}
            className={linkClass(variant, isActive)}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
};

export default MainNav;
