'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CalendarDays, ChevronLeft, ChevronRight, Hourglass, LayoutGrid, Sun, type LucideIcon } from 'lucide-react';
import ProductMedia from '@/components/ProductMedia';
import { FEED_COVER_TRANSITION } from '@/components/shared/product/feed-cover';
import { cn } from '@/lib/utils';

/** Waits this long after the last scroll before a swipe counts as done. */
const SETTLE_MS = 150;

const ICONS = { all: LayoutGrid, today: Sun, ending: Hourglass, events: CalendarDays } satisfies Record<string, LucideIcon>;

export interface ExploreRingItem {
  /** "all", "today", "ending", "events" or a category's slug. */
  key: string;
  label: string;
  href: string;
  /** A category's picture; the fixed items show their icon instead. */
  image?: string;
}

interface ExploreRingProps {
  items: ExploreRingItem[];
  activeKey: string;
  label: string;
  previousLabel: string;
  nextLabel: string;
  /** A way back to everything, at the ring's left; it takes the place of the ring's own "everything" item. */
  back?: { href: string; label: string };
}

/** The feed's categories as a small turning ring: the chosen one in the middle, a little of its neighbours at the sides.
    A swipe or an arrow turns it and opens the category that lands in the middle. */
const ExploreRing = ({ items: allItems, activeKey, label, previousLabel, nextLabel, back }: ExploreRingProps) => {
  const items = back ? allItems.filter((item) => item.key !== 'all') : allItems;
  const router = useRouter();
  const trackRef = useRef<HTMLDivElement>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  // Turns right away; the address follows once the server sends the page.
  const [shownKey, setShownKey] = useState(activeKey);
  const isFirstCentering = useRef(true);
  const shownIndex = Math.max(0, items.findIndex((item) => item.key === shownKey));

  useEffect(() => setShownKey(activeKey), [activeKey]);
  useEffect(() => () => clearTimeout(settleTimer.current), []);

  // scrollLeft, not scrollIntoView: that would also scroll the page.
  useEffect(() => {
    const track = trackRef.current;
    const item = track?.children[shownIndex] as HTMLElement | undefined;
    if (!track || !item) return;
    track.scrollTo({ left: item.offsetLeft - (track.clientWidth - item.offsetWidth) / 2, behavior: isFirstCentering.current ? 'instant' : 'smooth' });
    isFirstCentering.current = false;
  }, [shownIndex]);

  const open = (index: number) => {
    const item = items[index];
    setShownKey(item.key);
    router.push(item.href, { scroll: false });
  };

  // The ring turns round: past the last category comes the first again.
  const turn = (offset: number) => open((shownIndex + offset + items.length) % items.length);

  const onScroll = () => {
    clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => {
      const track = trackRef.current;
      if (!track) return;
      const middle = track.scrollLeft + track.clientWidth / 2;
      const children = Array.from(track.children) as HTMLElement[];
      const centered = children.findIndex((child) => child.offsetLeft <= middle && middle < child.offsetLeft + child.offsetWidth);
      if (centered >= 0 && centered !== shownIndex) open(centered);
    }, SETTLE_MS);
  };

  const arrowClass =
    'flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground';

  return (
    <nav aria-label={label} className={cn('mx-auto flex w-full items-start', back ? 'max-w-md sm:max-w-xl' : 'max-w-sm sm:max-w-lg')}>
      {back && (
        <Link href={back.href} scroll={false} className='group flex shrink-0 flex-col items-center gap-1 pt-3.5 sm:pt-5.5'>
          <span className={cn(arrowClass, 'border border-border group-hover:bg-muted group-hover:text-foreground')}>
            <ArrowLeft className='size-5' aria-hidden />
          </span>
          <span className='whitespace-nowrap text-xs font-medium'>{back.label}</span>
        </Link>
      )}
      <div className='min-w-0 flex-1'>
        <div className='flex items-center'>
          <button type='button' onClick={() => turn(-1)} aria-label={previousLabel} className={arrowClass}>
            <ChevronLeft className='size-5' aria-hidden />
          </button>
          {/* The side padding lets the first and the last item reach the middle; the mask fades the neighbours out. */}
          <div
            ref={trackRef}
            onScroll={onScroll}
            className='relative flex min-w-0 flex-1 snap-x snap-mandatory overflow-x-auto px-[calc(50%-2rem)] [mask-image:linear-gradient(to_right,transparent,black_30%,black_70%,transparent)] sm:px-[calc(50%-2.5rem)]'
          >
            {items.map((item, index) => {
              const isActive = index === shownIndex;
              const Icon = ICONS[item.key as keyof typeof ICONS];
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  scroll={false}
                  onClick={() => setShownKey(item.key)}
                  aria-label={item.label}
                  aria-current={item.key === activeKey ? 'page' : undefined}
                  className='flex h-16 w-16 shrink-0 snap-center items-center justify-center sm:h-20 sm:w-20'
                >
                  <span
                    className={cn(
                      'relative flex items-center justify-center overflow-hidden rounded-full border-2 transition-all duration-300',
                      isActive ? 'size-14 border-primary bg-primary text-primary-foreground sm:size-16' : 'size-10 border-border bg-muted text-muted-foreground sm:size-12'
                    )}
                    // The home ring's front card grows into this picture (use-open-feed.ts).
                    style={isActive && item.image ? { viewTransitionName: FEED_COVER_TRANSITION } : undefined}
                  >
                    {item.image ? (
                      <ProductMedia src={item.image} alt='' fill sizes='4rem' className='object-cover' />
                    ) : (
                      Icon && <Icon className={isActive ? 'size-6' : 'size-4'} aria-hidden />
                    )}
                  </span>
                </Link>
              );
            })}
          </div>
          <button type='button' onClick={() => turn(1)} aria-label={nextLabel} className={arrowClass}>
            <ChevronRight className='size-5' aria-hidden />
          </button>
        </div>
        {/* Only the chosen one is named, in full: the neighbours' names would be cut off at the sides. */}
        <p aria-hidden='true' className='line-clamp-2 text-balance px-1 text-center text-sm font-semibold'>
          {items[shownIndex]?.label}
        </p>
      </div>
    </nav>
  );
};

export default ExploreRing;
