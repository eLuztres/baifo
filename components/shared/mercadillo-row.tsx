'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// As on Amazon: one big card on a phone with a good part of the next showing, so it says it can be swiped; narrower than the list's columns elsewhere.
const ROW_CARD_CLASS = 'w-[62%] shrink-0 sm:w-[38%] md:w-[27%] xl:w-[19%]';

interface MercadilloRowProps {
  heading: string;
  /** Its few words, under the heading. */
  text: string;
  /** Where the heading leads: all of its listings. */
  href: string;
  seeAllLabel: string;
  /** With {page} and {pages}, e.g. "Página {page} de {pages}". */
  pageLabel: string;
  backLabel: string;
  nextLabel: string;
  /** The listings' cards, each in its own MercadilloRowItem. */
  children: ReactNode;
}

/** One Mercadillo in a line of its own, built like Amazon's rows: a heading that leads to all of it, then the cards,
    moved by swiping or, with a mouse, by page with the arrows on both sides. */
export default function MercadilloRow({ heading, text, href, seeAllLabel, pageLabel, backLabel, nextLabel, children }: MercadilloRowProps) {
  const scroller = useRef<HTMLUListElement>(null);
  const [position, setPosition] = useState({ page: 1, pages: 1, canGoBack: false, canGoNext: false });

  const updatePosition = () => {
    const row = scroller.current;
    if (!row) return;
    const canGoNext = row.scrollLeft + row.clientWidth < row.scrollWidth - 1;
    const pages = Math.ceil((row.scrollWidth - 1) / row.clientWidth);
    setPosition({ page: canGoNext ? Math.min(pages, Math.round(row.scrollLeft / row.clientWidth) + 1) : pages, pages, canGoBack: row.scrollLeft > 1, canGoNext });
  };

  useEffect(() => {
    const row = scroller.current;
    if (!row) return;
    const observer = new ResizeObserver(updatePosition);
    observer.observe(row);
    return () => observer.disconnect();
  }, []);

  const go = (direction: 1 | -1) => scroller.current?.scrollBy({ left: direction * scroller.current.clientWidth, behavior: 'smooth' });
  const hasPages = position.pages > 1;
  const arrowClass = 'absolute top-1/2 hidden h-12 w-9 -translate-y-1/2 rounded-xl sm:inline-flex';

  return (
    <section aria-label={heading} className='space-y-3 border-y border-border py-4 sm:space-y-4 sm:py-6'>
      <div className='space-y-1 px-1'>
        <div className='flex items-baseline justify-between gap-3'>
          <Link href={href} className='group flex min-w-0 items-baseline gap-2'>
            <h2 className='truncate font-display text-xl leading-tight group-hover:underline sm:text-3xl'>{heading}</h2>
            <span className='hidden shrink-0 text-sm text-primary sm:inline'>{seeAllLabel}</span>
            <ArrowRight className='size-5 shrink-0 self-center sm:hidden' aria-label={seeAllLabel} />
          </Link>
          {hasPages && (
            <p className='hidden shrink-0 text-sm text-muted-foreground tabular-nums sm:block'>
              {pageLabel.replace('{page}', String(position.page)).replace('{pages}', String(position.pages))}
            </p>
          )}
        </div>
        {text && <p className='line-clamp-3 max-w-3xl text-sm text-muted-foreground'>{text}</p>}
      </div>
      <div className={cn('relative', hasPages && 'sm:px-12')}>
        {/* Phones: up to the screen's edge, where the next card runs off it. */}
        <ul
          ref={scroller}
          onScroll={updatePosition}
          className='flex gap-3 overflow-x-auto overscroll-x-contain [scrollbar-width:none] max-sm:mx-[calc(50%-50vw)] max-sm:px-5 sm:gap-4'
        >
          {children}
        </ul>
        {hasPages && (
          <>
            <Button type='button' variant='outline' size='icon' aria-label={backLabel} disabled={!position.canGoBack} onClick={() => go(-1)} className={cn(arrowClass, 'left-0')}>
              <ChevronLeft />
            </Button>
            <Button type='button' variant='outline' size='icon' aria-label={nextLabel} disabled={!position.canGoNext} onClick={() => go(1)} className={cn(arrowClass, 'right-0')}>
              <ChevronRight />
            </Button>
          </>
        )}
      </div>
    </section>
  );
}

export const MercadilloRowItem = ({ children }: { children: ReactNode }) => <li className={ROW_CARD_CLASS}>{children}</li>;
