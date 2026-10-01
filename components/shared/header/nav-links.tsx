'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

interface NavLink {
  href: string;
  label: string;
}

interface NavLinksProps {
  links: NavLink[];
}

function isActiveLink(pathname: string, href: string): boolean {
  return href === '/' ? pathname === '/' : pathname.startsWith(href);
}

export default function NavLinks({ links }: NavLinksProps) {
  const pathname = usePathname();

  return (
    <nav className='hidden items-center gap-1 rounded-full border border-border bg-card/70 p-1 lg:flex'>
      {links.map((link) => {
        const isActive = isActiveLink(pathname, link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'rounded-full px-5 py-2 text-sm font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-foreground/70 hover:bg-muted hover:text-foreground'
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
