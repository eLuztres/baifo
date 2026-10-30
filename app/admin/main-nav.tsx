'use client';
import Link from 'next/link';
import {
  BadgePercent,
  ChevronDown,
  LayoutDashboard,
  LayoutGrid,
  List,
  MapPin,
  Plus,
  Receipt,
  Shapes,
  SlidersHorizontal,
  Sparkles,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { usePathname, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { CREATING_PARAM } from '@/lib/constants';
import React, { useEffect, useRef } from 'react';
import { useI18n } from '@/components/i18n-provider';
import type { TranslationKey } from '@/lib/i18n-core';
import type { AdminLink } from '@/lib/brand';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

// New product comes first: adding products is what the admin does most.
const links: { title: TranslationKey; href: string; icon: LucideIcon; isSalesOnly?: boolean; isAiOnly?: boolean; isOffersOnly?: boolean; isAdvanced?: boolean }[] = [
  {
    title: 'ADMIN_NEW_PRODUCT',
    href: '/admin/studio',
    icon: Plus,
  },
  {
    title: 'ADMIN_PRODUCTS',
    href: '/admin/products',
    icon: Shapes,
  },
  {
    title: 'ADMIN_OVERVIEW',
    href: '/admin/overview',
    icon: LayoutDashboard,
    isSalesOnly: true,
  },
  {
    title: 'ORDERS_TITLE',
    href: '/admin/orders',
    icon: Receipt,
    isSalesOnly: true,
  },
  {
    title: 'OFFERS_ADMIN_TITLE',
    href: '/admin/offers',
    icon: BadgePercent,
    isOffersOnly: true,
  },
  // Pages the admin opens seldom wait in the Advanced menu at the end.
  {
    title: 'ADMIN_AI_COSTS',
    href: '/admin/ai-costs',
    icon: Sparkles,
    isAiOnly: true,
    isAdvanced: true,
  },
  {
    title: 'ADMIN_USERS',
    href: '/admin/users',
    icon: Users,
    isAdvanced: true,
  },
];

// The icons a shop's own admin page can name in brand/admin-links.json.
const EXTRA_ICONS: Record<string, LucideIcon> = { grid: LayoutGrid, list: List, 'map-pin': MapPin };

interface NavLink {
  key: string;
  href: string;
  label: string;
  icon?: LucideIcon;
  isActive: boolean;
  isAdvanced?: boolean;
}

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
  extraLinks?: AdminLink[];
  /** `tabs`: a row of pills that scrolls sideways (phones); `inline`: plain links in the header bar. */
  variant?: 'inline' | 'tabs';
}

// One rail of pills; the active page sits on a raised pill with its icon in the brand color.
const linkClass = (variant: 'inline' | 'tabs', isActive: boolean) =>
  cn(
    'flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full font-medium transition-all [&_svg]:size-4 [&_svg]:shrink-0',
    variant === 'tabs' ? 'px-3 py-1.5 text-xs' : 'px-3 py-1.5 text-sm',
    isActive
      ? 'bg-background text-foreground shadow-sm ring-1 ring-border [&_svg]:text-primary'
      : 'text-muted-foreground hover:bg-background/60 hover:text-foreground'
  );

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
  const toNavLink = (link: AdminLink): NavLink => ({
    key: link.href,
    href: link.href,
    label: link.label,
    icon: link.icon ? EXTRA_ICONS[link.icon] : undefined,
    // The shop's own creation flow may sit under one of its links (e.g. /admin/listings/new).
    isActive: pathname.startsWith(link.href) && !isCreating,
  });
  const navLinks: NavLink[] = [];
  for (const item of links.filter((item) => !(isShowcase && item.isSalesOnly) && !(!isAiEnabled && item.isAiOnly) && !(!isOffersEnabled && item.isOffersOnly))) {
    const href = item.href === '/admin/studio' ? newProductHref : item.href;
    const isActive = href === newProductHref ? isCreating : pathname.includes(href);
    navLinks.push({ key: item.href, href, label: t(item.title), icon: item.icon, isActive, isAdvanced: item.isAdvanced });
    navLinks.push(...extraLinks.filter((link) => link.after === item.href).map(toNavLink));
  }
  const placedHrefs = new Set(navLinks.map((link) => link.key));
  navLinks.push(...extraLinks.filter((link) => !placedHrefs.has(link.href)).map(toNavLink));
  const mainLinks = navLinks.filter((link) => !link.isAdvanced);
  const advancedLinks = navLinks.filter((link) => link.isAdvanced);
  const isAdvancedActive = advancedLinks.some((link) => link.isActive);
  return (
    <nav
      ref={navRef}
      className={cn('flex items-center gap-0.5 rounded-full border border-border bg-muted/60 p-1', className)}
      {...props}
    >
      {mainLinks.map(({ key, href, label, icon: Icon, isActive }) => (
        <Link key={key} href={href} aria-current={isActive ? 'page' : undefined} className={linkClass(variant, isActive)}>
          {Icon && <Icon />}
          {label}
        </Link>
      ))}
      {advancedLinks.length > 0 && (
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger aria-current={isAdvancedActive ? 'page' : undefined} className={linkClass(variant, isAdvancedActive)}>
            <SlidersHorizontal />
            {t('ADMIN_ADVANCED')}
            <ChevronDown className='opacity-60' />
          </DropdownMenuTrigger>
          {/* Focus stays on the new page instead of ringing the button after a choice. */}
          <DropdownMenuContent align='end' className='min-w-44 rounded-2xl p-1.5' onCloseAutoFocus={(event) => event.preventDefault()}>
            {advancedLinks.map(({ key, href, label, icon: Icon, isActive }) => (
              <DropdownMenuItem key={key} asChild className={cn('rounded-xl', isActive && 'bg-accent text-accent-foreground')}>
                <Link href={href} aria-current={isActive ? 'page' : undefined}>
                  {Icon && <Icon />}
                  {label}
                </Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </nav>
  );
};

export default MainNav;
