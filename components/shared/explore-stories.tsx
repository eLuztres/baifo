'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { LayoutGrid } from 'lucide-react';
import ProductMedia from '@/components/ProductMedia';
import { cn } from '@/lib/utils';

// When each category was last opened, so its ring only lights up again for listings added since.
const SEEN_STORAGE_KEY = 'shop-seen-categories';

export interface StoryItem {
  /** The category's slug; "all" for everything. */
  key: string;
  label: string;
  href: string;
  image?: string;
  isActive: boolean;
  /** When its newest listing went online (ISO); undefined: nothing new in it. */
  newestAt?: string;
}

interface ExploreStoriesProps {
  items: StoryItem[];
  label: string;
  /** Before a first visit counts as seen: listings older than this (ISO) don't light a ring. */
  unseenSince: string;
}

const readSeen = (): Record<string, string> => {
  try {
    return JSON.parse(localStorage.getItem(SEEN_STORAGE_KEY) ?? '{}');
  } catch {
    return {};
  }
};

/** The categories as round pictures in one sideways row, like stories; a lit ring marks one with something new. */
const ExploreStories = ({ items, label, unseenSince }: ExploreStoriesProps) => {
  // Empty on the server and the first render, so the rings only light up after hydration.
  const [seen, setSeen] = useState<Record<string, string> | null>(null);
  const activeKey = items.find((item) => item.isActive)?.key;
  const rowRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const stored = readSeen();
    if (activeKey) {
      stored[activeKey] = new Date().toISOString();
      try {
        localStorage.setItem(SEEN_STORAGE_KEY, JSON.stringify(stored));
      } catch {}
    }
    setSeen(stored);
    // The chosen category in the middle of the row, also when it's far along on a phone; scrollLeft keeps the page still.
    const row = rowRef.current;
    const active = row?.querySelector<HTMLElement>('[aria-current="page"]');
    if (row && active) row.scrollLeft = active.offsetLeft - (row.clientWidth - active.clientWidth) / 2;
  }, [activeKey]);

  const isUnseen = (item: StoryItem) =>
    seen !== null && !item.isActive && item.newestAt !== undefined && item.newestAt > (seen[item.key] ?? unseenSince);

  return (
    <nav ref={rowRef} aria-label={label} className='relative -mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:gap-4'>
      {items.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          aria-current={item.isActive ? 'page' : undefined}
          className='group flex w-16 shrink-0 flex-col items-center gap-1 sm:w-[4.5rem]'
        >
          <span
            className={cn(
              'rounded-full p-[2.5px] transition-colors',
              isUnseen(item) ? 'bg-gradient-to-tr from-primary via-accent to-primary' : item.isActive ? 'bg-foreground' : 'bg-border'
            )}
          >
            <span className='relative block size-14 overflow-hidden rounded-full border-2 border-background bg-muted sm:size-16'>
              {item.image ? (
                <ProductMedia src={item.image} alt='' fill sizes='4rem' className='object-cover transition-transform group-hover:scale-105' />
              ) : (
                <span className='flex size-full items-center justify-center bg-primary text-primary-foreground'>
                  <LayoutGrid className='size-6' aria-hidden />
                </span>
              )}
            </span>
          </span>
          <span className={cn('w-full truncate text-center text-xs', item.isActive ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
            {item.label}
          </span>
        </Link>
      ))}
    </nav>
  );
};

export default ExploreStories;
