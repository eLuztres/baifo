'use client';

import Link from 'next/link';
import { Check, ChevronDown } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export interface FilterMenuItem {
  key: string;
  label: string;
  href: string;
  isActive: boolean;
  /** A subcategory, shown indented under its category. */
  isSub?: boolean;
}

interface ExploreFilterMenuProps {
  /** What is chosen, e.g. the category's name or "All categories". */
  label: string;
  /** Something other than "all" is chosen: the button looks selected. */
  isFiltered: boolean;
  items: FilterMenuItem[];
}

/** One filter's choices behind one button, so the feed's filters fit in a single row, even on a phone. */
const ExploreFilterMenu = ({ label, isFiltered, items }: ExploreFilterMenuProps) => (
  <DropdownMenu>
    <DropdownMenuTrigger
      className={cn(
        'inline-flex h-9 max-w-[55vw] shrink-0 items-center gap-1 rounded-full border px-3.5 text-sm transition-colors sm:max-w-xs',
        isFiltered
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-card text-foreground hover:border-primary/40'
      )}
    >
      <span className='truncate'>{label}</span>
      <ChevronDown className='size-4 shrink-0' aria-hidden />
    </DropdownMenuTrigger>
    <DropdownMenuContent align='start' className='max-h-[60svh] w-64 overflow-y-auto'>
      {items.map((item) => (
        <DropdownMenuItem key={item.key} asChild>
          <Link href={item.href} aria-current={item.isActive ? 'page' : undefined} className={cn('gap-2', item.isSub && 'pl-6 text-muted-foreground')}>
            <span className='flex-1 truncate'>{item.label}</span>
            {item.isActive && <Check className='size-4 text-primary' aria-hidden />}
          </Link>
        </DropdownMenuItem>
      ))}
    </DropdownMenuContent>
  </DropdownMenu>
);

export default ExploreFilterMenu;
