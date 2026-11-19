'use client';

import { Check } from 'lucide-react';
import { useI18n } from '@/components/i18n-provider';
import ProductMedia from '@/components/ProductMedia';
import { LOCALES, type Locale, type TranslationKey } from '@/lib/i18n-core';
import { cn } from '@/lib/utils';

export const CHOICE_TILE =
  'rounded-2xl border-2 border-transparent bg-muted/40 transition hover:border-primary hover:bg-primary/10 focus-visible:border-primary focus-visible:outline-none';
export const CHOSEN_TILE = 'border-primary bg-primary/10';

/** The shop's languages, in its own order, as in its language menu. */
export function useShopLanguages() {
  const { locales } = useI18n();
  return locales.flatMap((id) => LOCALES.filter((option) => option.id === id));
}

/** What the pop-up asks for, by what there is to choose. */
export const choiceHint = (hasPhotoChoice: boolean, hasLangChoice: boolean): TranslationKey =>
  !hasLangChoice ? 'PRINT_CHOOSE_PHOTO' : hasPhotoChoice ? 'PRINT_CHOOSE_PHOTO_LANG' : 'PRINT_CHOOSE_LANG';

interface PhotoLanguageChoiceProps {
  /** The listing's photos to choose from: the row shows only when there are several. */
  photos: string[];
  /** The chosen one, an index into `photos`. */
  photo: number;
  onPhotoChange: (index: number) => void;
  lang: Locale;
  onLangChange: (lang: Locale) => void;
}

/** Which photo and which language, each only when there is a choice: printing and sharing a listing ask the same. */
export default function PhotoLanguageChoice({ photos, photo, onPhotoChange, lang, onLangChange }: PhotoLanguageChoiceProps) {
  const { t } = useI18n();
  const languages = useShopLanguages();

  return (
    <>
      {photos.length > 1 && (
        <section>
          <h3 className='mb-2 px-0.5 font-sans text-xs font-bold uppercase tracking-wider text-muted-foreground'>{t('PRINT_PHOTO')}</h3>
          <div className='grid grid-cols-4 gap-2'>
            {photos.map((src, index) => (
              <button
                key={index}
                type='button'
                onClick={() => onPhotoChange(index)}
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
      {languages.length > 1 && (
        <section>
          <h3 className='mb-2 px-0.5 font-sans text-xs font-bold uppercase tracking-wider text-muted-foreground'>{t('PRINT_LANGUAGE')}</h3>
          <div className='grid gap-1 sm:gap-1.5' style={{ gridTemplateColumns: `repeat(${languages.length}, minmax(0, 1fr))` }}>
            {languages.map((option) => (
              <button
                key={option.id}
                type='button'
                onClick={() => onLangChange(option.id)}
                aria-pressed={option.id === lang}
                className={cn(CHOICE_TILE, 'flex min-w-0 flex-col items-center px-0 py-2', option.id === lang && CHOSEN_TILE)}
              >
                <span className='font-bold'>{option.label}</span>
                <span className='w-full truncate text-center text-[10px] text-muted-foreground sm:text-[10.5px]'>{option.name}</span>
              </button>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
