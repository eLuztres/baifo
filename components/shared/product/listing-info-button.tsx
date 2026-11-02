'use client';

import type { ReactNode } from 'react';
import { Info, X } from 'lucide-react';
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { cn } from '@/lib/utils';

interface ListingInfoButtonProps {
  /** The listing's name, the pop-up's title. */
  title: string;
  /** Read out for the button, e.g. "Description". */
  label: string;
  closeLabel: string;
  /** The description and the details, rendered by the page. */
  children: ReactNode;
  className?: string;
}

/** Phones: a clear ⓘ button that opens the listing's description in a pop-up from the bottom; a long text scrolls inside it. */
export default function ListingInfoButton({ title, label, closeLabel, children, className }: ListingInfoButtonProps) {
  return (
    <Drawer shouldScaleBackground={false}>
      <DrawerTrigger
        aria-label={label}
        title={label}
        className={cn(
          'flex size-12 shrink-0 items-center justify-center rounded-full border-2 border-primary/60 bg-primary/15 text-primary transition hover:bg-primary/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          className
        )}
      >
        <Info className='size-6' strokeWidth={2.25} aria-hidden />
      </DrawerTrigger>
      <DrawerContent className='max-h-[80svh] rounded-t-3xl border-border bg-card'>
        <div className='flex items-start gap-3 px-5 pb-3 pt-4'>
          <DrawerTitle className='flex-1 font-display text-xl font-normal leading-tight'>{title}</DrawerTitle>
          <DrawerClose aria-label={closeLabel} className='flex size-9 shrink-0 items-center justify-center rounded-full bg-muted'>
            <X className='size-4' aria-hidden />
          </DrawerClose>
        </div>
        <DrawerDescription asChild>
          <div className='min-h-0 overflow-y-auto overscroll-contain px-5 pb-8 text-base leading-7 text-foreground/90'>{children}</div>
        </DrawerDescription>
      </DrawerContent>
    </Drawer>
  );
}
