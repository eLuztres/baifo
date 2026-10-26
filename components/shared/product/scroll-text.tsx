'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScrollTextProps {
  children: string;
  /** Read out for the arrow, e.g. "More". */
  moreLabel: string;
  className?: string;
}

/** A text that scrolls inside its box; while more is below, a fade and an arrow say so (phones hide scrollbars). */
export default function ScrollText({ children, moreLabel, className }: ScrollTextProps) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = () => setHasMore(element.scrollTop + element.clientHeight < element.scrollHeight - 4);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    element.addEventListener('scroll', update, { passive: true });
    return () => {
      observer.disconnect();
      element.removeEventListener('scroll', update);
    };
  }, [children]);

  const scrollOn = () => ref.current?.scrollBy({ top: ref.current.clientHeight * 0.8, behavior: 'smooth' });

  return (
    <div className='relative flex min-h-0 flex-col'>
      <p
        ref={ref}
        className={cn(
          'min-h-0 overflow-y-auto overscroll-contain whitespace-pre-line [scrollbar-width:thin]',
          hasMore && '[mask-image:linear-gradient(to_bottom,black_calc(100%-2.5rem),transparent)]',
          className
        )}
      >
        {children}
      </p>
      {hasMore && (
        <button
          type='button'
          onClick={scrollOn}
          aria-label={moreLabel}
          className='absolute bottom-0 left-1/2 flex size-8 -translate-x-1/2 items-center justify-center rounded-full border border-primary/30 bg-background/90 text-primary shadow-sm motion-safe:animate-bounce'
        >
          <ChevronDown className='size-4' aria-hidden />
        </button>
      )}
    </div>
  );
}
