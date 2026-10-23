'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import React from 'react';
import { useI18n } from '@/components/i18n-provider';
import type { TranslationKey } from '@/lib/i18n-core';

const links: { title: TranslationKey; href: string }[] = [
  {
    title: 'USER_PROFILE',
    href: '/user/profile',
  },
  {
    title: 'ORDERS_TITLE',
    href: '/user/orders',
  },
];

const MainNav = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) => {
  const pathname = usePathname();
  const { t } = useI18n();
  return (
    <nav
      className={cn('flex items-center space-x-4 lg:space-x-6', className)}
      {...props}
    >
      {links.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            'text-sm font-medium transition-colors hover:text-primary',
            pathname.includes(item.href) ? '' : 'text-muted-foreground'
          )}
        >
          {t(item.title)}
        </Link>
      ))}
    </nav>
  );
};

export default MainNav;
