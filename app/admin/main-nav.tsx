'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import React from 'react';
import { useI18n } from '@/components/i18n-provider';
import type { TranslationKey } from '@/lib/i18n-core';

// New product comes first: adding products is what the admin does most.
const links: { title: TranslationKey; href: string; isSalesOnly?: boolean }[] = [
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
    title: 'ADMIN_USERS',
    href: '/admin/users',
  },
];

interface MainNavProps extends React.HTMLAttributes<HTMLElement> {
  /** Showcase shops sell nothing online, so sales figures and orders stay out of the menu. */
  isShowcase: boolean;
  /** Where "New product" leads (NEW_PRODUCT_PATH). */
  newProductHref: string;
  /** The shop's own admin pages (brand/admin-links.json), already in the visitor's language. */
  extraLinks?: { href: string; label: string }[];
}

const MainNav = ({ className, isShowcase, newProductHref, extraLinks = [], ...props }: MainNavProps) => {
  const pathname = usePathname();
  const { t } = useI18n();
  return (
    <nav
      className={cn('flex items-center space-x-4 lg:space-x-6', className)}
      {...props}
    >
      {links.filter((item) => !(isShowcase && item.isSalesOnly)).map((item) => {
        const href = item.href === '/admin/studio' ? newProductHref : item.href;
        return (
          <Link
            key={item.href}
            href={href}
            className={cn(
              'text-sm font-medium transition-colors hover:text-primary',
              pathname.includes(href) ? '' : 'text-muted-foreground'
            )}
          >
            {t(item.title)}
          </Link>
        );
      })}
      {extraLinks.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={cn(
            'text-sm font-medium transition-colors hover:text-primary',
            // The shop's own creation page may sit under one of its links (e.g. /admin/listings/new).
            pathname.startsWith(link.href) && !pathname.startsWith(newProductHref) ? '' : 'text-muted-foreground'
          )}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
};

export default MainNav;
