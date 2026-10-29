'use client';

import { useRef, type ReactNode } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ExploreRowProps {
  title: string;
  /** The whole category or selection. */
  seeAllHref: string;
  seeAllLabel: string;
  previousLabel: string;
  nextLabel: string;
  /** The row's tiles, each an <li>. */
  children: ReactNode;
}

/** One row of listings that swipes sideways, like a streaming shelf; arrows for a mouse, "see all" opens the whole thing. */
const ExploreRow = ({ title, seeAllHref, seeAllLabel, previousLabel, nextLabel, children }: ExploreRowProps) => {
  const listRef = useRef<HTMLUListElement>(null);
  // Most of a screen at a time, so the last tile seen stays in sight.
  const page = (direction: number) => {
    const list = listRef.current;
    list?.scrollBy({ left: direction * list.clientWidth * 0.8, behavior: 'smooth' });
  };

  const arrowClass =
    'absolute top-1/2 z-10 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/90 text-foreground opacity-0 shadow-md transition-opacity group-hover:opacity-100 focus-visible:opacity-100 sm:flex';

  return (
    <section className='space-y-2'>
      <div className='flex items-baseline justify-between gap-3'>
        <h2 className='min-w-0 truncate font-display text-xl sm:text-2xl'>{title}</h2>
        <Link href={seeAllHref} className='inline-flex shrink-0 items-center gap-0.5 text-sm font-medium text-primary underline-offset-4 hover:underline'>
          {seeAllLabel} <ChevronRight className='size-4' aria-hidden />
        </Link>
      </div>
      <div className='group relative -mx-4'>
        <ul ref={listRef} className='flex snap-x snap-mandatory scroll-px-4 gap-2 overflow-x-auto px-4 sm:gap-3'>
          {children}
        </ul>
        <button type='button' onClick={() => page(-1)} aria-label={previousLabel} className={`${arrowClass} left-2`}>
          <ChevronLeft className='size-5' aria-hidden />
        </button>
        <button type='button' onClick={() => page(1)} aria-label={nextLabel} className={`${arrowClass} right-2`}>
          <ChevronRight className='size-5' aria-hidden />
        </button>
      </div>
    </section>
  );
};

export default ExploreRow;
