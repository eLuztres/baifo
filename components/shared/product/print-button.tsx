'use client';

import { useState, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Check, Printer } from 'lucide-react';
import { useI18n } from '@/components/i18n-provider';
import ProductMedia from '@/components/ProductMedia';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { LOCALES, type Locale, type TranslationKey } from '@/lib/i18n-core';
import { PRINT_COPIES, type PrintCopies } from '@/lib/print';
import { cn } from '@/lib/utils';

interface PrintButtonProps {
  slug: string;
  label: string;
  /** The listing's printable media (printableMedia), in order: one of them is printed. */
  photos: string[];
  className?: string;
}

const COPY_LABELS: Record<PrintCopies, TranslationKey> = {
  1: 'PRINT_COPIES_1',
  2: 'PRINT_COPIES_2',
  4: 'PRINT_COPIES_4',
};

const TILE = 'rounded-2xl border-2 border-transparent bg-muted/40 transition hover:border-primary hover:bg-primary/10 focus-visible:border-primary focus-visible:outline-none';
const CHOSEN = 'border-primary bg-primary/10';

/** Asks how many copies go on a sheet, then which photo and language (only when there is a choice), then opens the listing ready to print. */
export default function PrintButton({ slug, label, photos, className }: PrintButtonProps) {
  const { t, locale, locales } = useI18n();
  const [copies, setCopies] = useState<PrintCopies | null>(null);
  const [photo, setPhoto] = useState(0);
  const [lang, setLang] = useState<Locale>(locale);
  // In the shop's own order, as in its language menu.
  const languages = locales.flatMap((id) => LOCALES.filter((option) => option.id === id));
  const hasPhotoChoice = photos.length > 1;
  const hasLangChoice = languages.length > 1;
  const hasSecondStep = hasPhotoChoice || hasLangChoice;
  const printHref = (count: PrintCopies) => `/imprimir/${slug}?copias=${count}${hasPhotoChoice ? `&foto=${photo}` : ''}&lang=${lang}&imprimir=1`;
  // Another language needs a full page load: the texts around the sheet come from the root layout, which a client navigation keeps.
  const printLink = (count: PrintCopies, content: ReactNode, className?: string) =>
    lang === locale ? (
      <Link href={printHref(count)} prefetch={false} className={className}>
        {content}
      </Link>
    ) : (
      <a href={printHref(count)} className={className}>
        {content}
      </a>
    );
  const hint: TranslationKey = !copies ? 'PRINT_CHOOSE_HINT' : !hasLangChoice ? 'PRINT_CHOOSE_PHOTO' : hasPhotoChoice ? 'PRINT_CHOOSE_PHOTO_LANG' : 'PRINT_CHOOSE_LANG';

  // Every opening starts over, in the language the site is shown in.
  const startOver = (isOpen: boolean) => {
    if (!isOpen) return;
    setCopies(null);
    setPhoto(0);
    setLang(locale);
  };

  return (
    <Dialog onOpenChange={startOver}>
      <DialogTrigger asChild>
        <Button variant='ghost' size='icon' aria-label={label} title={label} className={cn('size-10 shrink-0 rounded-full text-muted-foreground hover:text-primary', className)}>
          <Printer className='size-5' />
        </Button>
      </DialogTrigger>
      <DialogContent className='w-[calc(100%-2rem)] max-w-md rounded-3xl p-4 sm:p-6'>
        {copies && (
          <Button variant='ghost' size='icon' onClick={() => setCopies(null)} aria-label={t('PRINT_STEP_BACK')} className='absolute left-3 top-3 size-8 rounded-full sm:left-4 sm:top-4'>
            <ArrowLeft className='size-5' />
          </Button>
        )}
        <DialogHeader>
          <DialogTitle className={cn('px-8 font-display text-2xl', !copies && 'sm:pl-0')}>{t('PRINT_CHOOSE_TITLE')}</DialogTitle>
          <DialogDescription className={cn(copies && 'sm:pl-8')}>{t(hint)}</DialogDescription>
        </DialogHeader>
        {!copies ? (
          <div key='copies' className='grid grid-cols-3 gap-1.5 duration-200 animate-in fade-in sm:gap-3'>
            {PRINT_COPIES.map((count, index) => {
              const content = (
                <>
                  <Image src={`/brand/print/per-sheet-${count}.webp`} alt='' width={160} height={160} className='aspect-square w-full rounded-xl bg-muted/70' />
                  <span className='mt-2 text-sm font-bold'>{count}</span>
                  <span className='flex min-h-[2lh] items-start text-[11px] leading-tight text-muted-foreground text-balance sm:min-h-0 sm:text-xs'>{t(COPY_LABELS[count])}</span>
                </>
              );
              const tile = cn(TILE, 'flex flex-col items-center p-1 pb-2 text-center sm:p-1.5 sm:pb-2.5');
              // Nothing left to choose: straight to the print, no second step.
              return hasSecondStep ? (
                // Coming back from the second step, focus starts here again.
                <button key={count} type='button' onClick={() => setCopies(count)} autoFocus={index === 0} className={tile}>
                  {content}
                </button>
              ) : (
                <DialogClose key={count} asChild>
                  {printLink(count, content, tile)}
                </DialogClose>
              );
            })}
          </div>
        ) : (
          <div key='photo-and-language' className='flex flex-col gap-4 duration-200 animate-in fade-in slide-in-from-right-6'>
            {hasPhotoChoice && (
              <section>
                <h3 className='mb-2 px-0.5 font-sans text-xs font-bold uppercase tracking-wider text-muted-foreground'>{t('PRINT_PHOTO')}</h3>
                <div className='grid grid-cols-4 gap-2'>
                  {photos.map((src, index) => (
                    <button
                      key={index}
                      type='button'
                      onClick={() => setPhoto(index)}
                      aria-pressed={index === photo}
                      aria-label={`${t('PRINT_PHOTO')} ${index + 1}`}
                      className={cn(
                        'relative aspect-[3/4] overflow-hidden rounded-xl outline-none ring-offset-2 ring-offset-background transition focus-visible:ring-2 focus-visible:ring-primary',
                        index === photo && 'ring-[3px] ring-primary focus-visible:ring-[3px]'
                      )}
                    >
                      {/* The gallery's own small thumbnails, already loaded on the listing. */}
                      <ProductMedia src={src} alt='' fill sizes='5rem' isStill />
                      {index === photo && (
                        <span className='absolute right-1 top-1 grid size-5 place-items-center rounded-full bg-primary text-primary-foreground'>
                          <Check className='size-3.5' strokeWidth={3} />
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </section>
            )}
            {hasLangChoice && (
              <section>
                <h3 className='mb-2 px-0.5 font-sans text-xs font-bold uppercase tracking-wider text-muted-foreground'>{t('PRINT_LANGUAGE')}</h3>
                <div className='grid gap-1 sm:gap-1.5' style={{ gridTemplateColumns: `repeat(${languages.length}, minmax(0, 1fr))` }}>
                  {languages.map((option) => (
                    <button
                      key={option.id}
                      type='button'
                      onClick={() => setLang(option.id)}
                      aria-pressed={option.id === lang}
                      className={cn(TILE, 'flex min-w-0 flex-col items-center px-0 py-2', option.id === lang && CHOSEN)}
                    >
                      <span className='font-bold'>{option.label}</span>
                      <span className='w-full truncate text-center text-[10px] text-muted-foreground sm:text-[10.5px]'>{option.name}</span>
                    </button>
                  ))}
                </div>
              </section>
            )}
            <DialogClose asChild>
              <Button asChild size='lg' autoFocus className='h-12 w-full rounded-full text-base font-bold'>
                {printLink(
                  copies,
                  <>
                    <Printer className='size-5' /> {t('PRINT')}
                  </>
                )}
              </Button>
            </DialogClose>
          </div>
        )}
        {hasSecondStep && (
          <div aria-hidden className='flex justify-center gap-1.5'>
            <span className='h-1 w-5 rounded-full bg-primary' />
            <span className={cn('h-1 w-5 rounded-full', copies ? 'bg-primary' : 'bg-muted')} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
