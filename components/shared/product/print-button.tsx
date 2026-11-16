'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Printer } from 'lucide-react';
import { useI18n } from '@/components/i18n-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import type { TranslationKey } from '@/lib/i18n-core';
import { PRINT_COPIES } from '@/lib/print';
import { cn } from '@/lib/utils';

interface PrintButtonProps {
  slug: string;
  label: string;
  className?: string;
}

const COPY_LABELS: Record<(typeof PRINT_COPIES)[number], TranslationKey> = {
  1: 'PRINT_COPIES_1',
  2: 'PRINT_COPIES_2',
  4: 'PRINT_COPIES_4',
};

/** Asks how many copies go on a sheet (1, 2 or 4), then opens the listing ready to print or save as a PDF. */
export default function PrintButton({ slug, label, className }: PrintButtonProps) {
  const { t } = useI18n();
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant='ghost' size='icon' aria-label={label} title={label} className={cn('size-10 shrink-0 rounded-full text-muted-foreground hover:text-primary', className)}>
          <Printer className='size-5' />
        </Button>
      </DialogTrigger>
      <DialogContent className='w-[calc(100%-2rem)] max-w-md rounded-3xl p-4 sm:p-6'>
        <DialogHeader>
          <DialogTitle className='px-8 font-display text-2xl sm:pl-0'>{t('PRINT_CHOOSE_TITLE')}</DialogTitle>
          <DialogDescription>{t('PRINT_CHOOSE_HINT')}</DialogDescription>
        </DialogHeader>
        <div className='grid grid-cols-3 gap-1.5 sm:gap-3'>
          {PRINT_COPIES.map((copies) => (
            <DialogClose key={copies} asChild>
              <Link
                href={`/imprimir/${slug}?copias=${copies}&imprimir=1`}
                prefetch={false}
                className='flex flex-col items-center rounded-2xl border-2 border-transparent bg-muted/40 p-1 pb-2 text-center sm:p-1.5 sm:pb-2.5 transition hover:border-primary hover:bg-primary/10 focus-visible:border-primary focus-visible:outline-none'
              >
                <Image src={`/brand/print/per-sheet-${copies}.webp`} alt='' width={160} height={160} className='aspect-square w-full rounded-xl' />
                <span className='mt-2 text-sm font-bold'>{copies}</span>
                <span className='flex min-h-[2lh] items-start text-[11px] leading-tight text-muted-foreground text-balance sm:min-h-0 sm:text-xs'>{t(COPY_LABELS[copies])}</span>
              </Link>
            </DialogClose>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
