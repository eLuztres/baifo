'use client';

import Link from 'next/link';
import { MercadilloIcon } from '@/components/shared/mercadillo-row';
import { cn } from '@/lib/utils';
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

export interface MercadilloLink {
  slug: string;
  name: string;
  icon: string | null;
  /** Hoy: its sun and a line under the name (how many listings it holds). */
  isToday?: boolean;
  note?: string;
}

interface MercadilloSheetProps {
  mercadillos: MercadilloLink[];
  label: string;
  /** The button's look, from the page it sits on. */
  className?: string;
}

/** A button that slides up every Mercadillo in a list to scroll; on the start page, the left half of the split button. */
export default function MercadilloSheet({ mercadillos, label, className }: MercadilloSheetProps) {
  if (mercadillos.length === 0) return null;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button type='button' className={className}>
          {label}
        </button>
      </SheetTrigger>
      <SheetContent side='bottom' aria-describedby={undefined} className='flex max-h-[80svh] flex-col rounded-t-3xl px-4 pb-8 pt-14 sm:px-6'>
        {/* No heading on screen: it's clear what opened. Screen readers still hear the name. */}
        <SheetHeader className='sr-only'>
          <SheetTitle>{label}</SheetTitle>
        </SheetHeader>
        <ul className='mx-auto grid w-full max-w-3xl grid-cols-1 gap-2 overflow-y-auto overscroll-contain min-[360px]:grid-cols-2 sm:grid-cols-3 sm:gap-3'>
          {mercadillos.map(({ slug, name, icon, isToday, note }) => (
            <li key={slug}>
              <SheetClose asChild>
                <Link
                  href={`/explore?seleccion=${slug}`}
                  className={cn(
                    'flex h-full items-center gap-3 rounded-2xl border border-border bg-card p-2 pr-3 transition hover:border-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    isToday && 'border-accent/50'
                  )}
                >
                  <MercadilloIcon src={icon} isToday={isToday} sizes='3rem' className='size-12' />
                  <span className='min-w-0'>
                    <span className='line-clamp-2 text-sm font-semibold leading-tight'>{name}</span>
                    {note && <span className='block text-xs text-muted-foreground'>{note}</span>}
                  </span>
                </Link>
              </SheetClose>
            </li>
          ))}
        </ul>
      </SheetContent>
    </Sheet>
  );
}
