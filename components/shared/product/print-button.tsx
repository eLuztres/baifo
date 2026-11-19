'use client';

import { useState, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Printer } from 'lucide-react';
import { useI18n } from '@/components/i18n-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { type Locale, type TranslationKey } from '@/lib/i18n-core';
import { photoName, PRINT_COPIES, type PrintCopies } from '@/lib/print';
import { cn } from '@/lib/utils';
import PhotoLanguageChoice, { CHOICE_TILE, choiceHint, useShopLanguages } from './photo-language-choice';

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

/** Asks how many copies go on a sheet, then which photo and language (only when there is a choice), then opens the listing ready to print. */
export default function PrintButton({ slug, label, photos, className }: PrintButtonProps) {
  const { t, locale } = useI18n();
  const [copies, setCopies] = useState<PrintCopies | null>(null);
  const [photo, setPhoto] = useState(0);
  const [lang, setLang] = useState<Locale>(locale);
  const languages = useShopLanguages();
  const hasPhotoChoice = photos.length > 1;
  const hasLangChoice = languages.length > 1;
  const hasSecondStep = hasPhotoChoice || hasLangChoice;
  const printHref = (count: PrintCopies) => `/imprimir/${slug}?copias=${count}${hasPhotoChoice ? `&foto=${encodeURIComponent(photoName(photos[photo]))}` : ''}&lang=${lang}&imprimir=1`;
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
  const hint: TranslationKey = !copies ? 'PRINT_CHOOSE_HINT' : choiceHint(hasPhotoChoice, hasLangChoice);

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
              const tile = cn(CHOICE_TILE, 'flex flex-col items-center p-1 pb-2 text-center sm:p-1.5 sm:pb-2.5');
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
            <PhotoLanguageChoice photos={photos} photo={photo} onPhotoChange={setPhoto} lang={lang} onLangChange={setLang} />
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
