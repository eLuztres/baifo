'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { LayoutGrid } from 'lucide-react';
import ProductMedia from '@/components/ProductMedia';
import { cn } from '@/lib/utils';

export interface RailCategory {
  href: string;
  label: string;
  image?: string;
  count: number;
  isActive: boolean;
}

interface CategoryRailProps {
  /** "Todo" first: everything, no category. */
  all: RailCategory;
  categories: RailCategory[];
}

/** Phones: the categories as round pictures with their counts, to tap instead of typing. It stays on top while
    scrolling, below the header while that shows. */
export default function CategoryRail({ all, categories }: CategoryRailProps) {
  const activeRef = useRef<HTMLAnchorElement>(null);

  // The chosen category may be far right: bring it into view after the page opens with it.
  useEffect(() => {
    activeRef.current?.scrollIntoView({ inline: 'center', block: 'nearest' });
  }, []);

  const renderItem = (item: RailCategory, picture: React.ReactNode) => (
    <li key={item.href} className='w-[4.5rem] shrink-0'>
      <Link
        ref={item.isActive ? activeRef : undefined}
        href={item.href}
        aria-current={item.isActive ? 'page' : undefined}
        className='flex flex-col items-center gap-1.5 text-center focus-visible:outline-none'
      >
        <span
          className={cn(
            'relative block size-16 rounded-full p-[3px] transition',
            item.isActive ? 'bg-primary shadow-[0_0_0_3px] shadow-primary/30' : 'bg-gradient-to-tr from-primary via-primary/40 to-primary'
          )}
        >
          <span className='relative block size-full overflow-hidden rounded-full border-[3px] border-background bg-muted'>{picture}</span>
          <span className='absolute -bottom-0.5 -right-1 rounded-full border border-border bg-card px-1.5 text-[0.65rem] font-semibold tabular-nums'>
            {item.count}
          </span>
        </span>
        <span className={cn('line-clamp-2 text-[0.7rem] leading-tight', item.isActive ? 'font-semibold text-primary' : 'text-foreground/85')}>
          {item.label}
        </span>
      </Link>
    </li>
  );

  return (
    <nav
      // Sticks under the header; once the header slides away it moves up to the very top.
      className='sticky top-16 z-30 -mx-4 !-mt-4 bg-background/95 py-2 backdrop-blur transition-[top] duration-200 [body:has(header[data-hidden=true])_&]:top-0 sm:hidden'
    >
      <ul className='flex gap-2 overflow-x-auto px-3 [scrollbar-width:none]'>
        {renderItem(
          all,
          <span className='flex size-full items-center justify-center text-primary'>
            <LayoutGrid className='size-6' aria-hidden />
          </span>
        )}
        {categories.map((category) =>
          renderItem(category, category.image && <ProductMedia src={category.image} alt='' fill sizes='64px' isStill />)
        )}
      </ul>
    </nav>
  );
}
