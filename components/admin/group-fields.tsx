'use client';

import { useRef, useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import slugify from 'slugify';
import { ImageIcon, Languages, Loader2, Sparkles } from 'lucide-react';
import ProductMedia from '@/components/ProductMedia';
import { useI18n } from '@/components/i18n-provider';
import { Button } from '@/components/ui/button';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import TextModeSwitch, { type TextModeTexts } from '@/components/marketplace/text-mode-switch';
import { improveCategory, translateCategory } from '@/lib/actions/category.actions';
import { generateCategoryCover } from '@/lib/actions/studio.actions';
import type { LocalizedText } from '@/lib/category';
import { LOCALES, translateMessage, type Locale } from '@/lib/i18n-core';
import { preparePhotos } from '@/lib/prepare-photos';
import { useUploadThing } from '@/lib/uploadthing';
import type { TextMode } from '@/lib/marketplace/text-versions';

/** What a category and a Mercadillo have in common. */
export interface GroupFormValues {
  slug: string;
  name: LocalizedText;
  text: LocalizedText;
  image: string | null;
}

interface GroupFieldsOptions {
  /** The shop's language first; the admin writes in it. */
  locales: Locale[];
  /** The group being edited; a new one is made without it. */
  group?: { name: LocalizedText; text: LocalizedText };
  /** What the AI makes the cover from when there is no description. */
  coverFallback?: () => string;
}

/** The name, description, cover and translations of a group being edited, for GroupFields and the editor's save. */
export function useGroupFields<T extends GroupFormValues>(typedForm: UseFormReturn<T>, { locales, group, coverFallback }: GroupFieldsOptions) {
  // A form with more fields is one with these fields too; only useForm's types can't say so.
  const form = typedForm as unknown as UseFormReturn<GroupFormValues>;
  const { t } = useI18n();
  const { toast } = useToast();
  const [isMakingCover, setIsMakingCover] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  // The admin writes in the shop's language (listed first); every other language is a compact tab.
  const [shopLocale, ...otherLocales] = locales;
  const [shownLocale, setShownLocale] = useState<Locale | undefined>(otherLocales[0]);
  // Languages the admin corrected by hand: a new automatic translation leaves them as they are.
  const correctedLocales = useRef(new Set<Locale>());
  // What was last translated, so leaving a field without changing it doesn't translate again.
  const lastTranslated = useRef(JSON.stringify([group?.name?.[shopLocale] ?? '', group?.text?.[shopLocale] ?? '']));
  // The description as the admin wrote it, so "My text as is" brings it back after the AI's version.
  const ownText = useRef(group?.text?.[shopLocale] ?? '');
  const [textMode, setTextMode] = useState<TextMode>('original');
  const [isImproving, setIsImproving] = useState(false);
  const coverInput = useRef<HTMLInputElement>(null);
  const { startUpload, isUploading } = useUploadThing('imageUploader', {
    onClientUploadComplete: (files) => {
      if (files[0]) form.setValue('image', files[0].ufsUrl, { shouldDirty: true });
    },
    onUploadError: () => {
      toast({ variant: 'destructive', description: t('STUDIO_UPLOAD_FAILED') });
    },
  });
  const shopName = form.watch(`name.${shopLocale}`)?.trim() ?? '';

  const translate = async (isForced: boolean) => {
    const name = form.getValues(`name.${shopLocale}`)?.trim() ?? '';
    const text = form.getValues(`text.${shopLocale}`)?.trim() ?? '';
    const key = JSON.stringify([name, text]);
    if (!name || otherLocales.length === 0 || (!isForced && key === lastTranslated.current)) return;
    setIsTranslating(true);
    const result = await translateCategory({ name, text });
    setIsTranslating(false);
    if (!result.success || !('texts' in result) || !result.texts) return toast({ variant: 'destructive', description: translateMessage(t, result.message) });
    lastTranslated.current = key;
    if (isForced) correctedLocales.current.clear();
    for (const locale of otherLocales) {
      const made = result.texts[locale];
      if (!made || correctedLocales.current.has(locale)) continue;
      form.setValue(`name.${locale}`, made.name, { shouldDirty: true });
      form.setValue(`text.${locale}`, made.text, { shouldDirty: true });
    }
  };

  /** Before saving: changed words get translated, and so does a language still without a name. */
  const translateBeforeSave = () => translate(otherLocales.some((locale) => !form.getValues(`name.${locale}`)?.trim()));

  // The AI's version replaces the description and every translation; the admin's own words come back with a click.
  const chooseTextMode = async (mode: TextMode) => {
    if (mode === 'original') {
      form.setValue(`text.${shopLocale}`, ownText.current, { shouldDirty: true });
      setTextMode(mode);
      return translate(true);
    }
    setIsImproving(true);
    const result = await improveCategory({ name: shopName, text: ownText.current });
    setIsImproving(false);
    if (!result.success || !('texts' in result) || !result.texts) return toast({ variant: 'destructive', description: translateMessage(t, result.message) });
    const improved = result.texts[shopLocale]?.text ?? '';
    form.setValue(`text.${shopLocale}`, improved, { shouldDirty: true });
    correctedLocales.current.clear();
    for (const locale of otherLocales) {
      const made = result.texts[locale];
      if (!made) continue;
      form.setValue(`name.${locale}`, made.name, { shouldDirty: true });
      form.setValue(`text.${locale}`, made.text, { shouldDirty: true });
    }
    lastTranslated.current = JSON.stringify([shopName, improved]);
    setTextMode(mode);
  };

  // A new group gets its link name from its first name.
  const fillSlug = (name: string) => {
    if (!group && !form.getValues('slug')) form.setValue('slug', slugify(name, { lower: true, strict: true }));
  };

  // The description says what the cover shows; a template shop without one still has its photo scene.
  const makeCover = async () => {
    setIsMakingCover(true);
    const description = form.getValues(`text.${shopLocale}`)?.trim() || (coverFallback?.() ?? '');
    const result = await generateCategoryCover(description, form.getValues(`name.${shopLocale}`) ?? '');
    setIsMakingCover(false);
    if (!result.success || !result.url) return toast({ variant: 'destructive', description: translateMessage(t, result.message) });
    form.setValue('image', result.url, { shouldDirty: true });
  };

  return {
    form,
    shopLocale,
    otherLocales,
    shownLocale,
    setShownLocale,
    correctedLocales,
    ownText,
    textMode,
    chooseTextMode,
    coverInput,
    startUpload,
    shopName,
    translate,
    translateBeforeSave,
    fillSlug,
    makeCover,
    isMakingCover,
    isTranslating,
    isImproving,
    isUploading,
    /** Saving now would lose what is still being made. */
    isBusy: isTranslating || isMakingCover || isImproving || isUploading,
  };
}

interface GroupFieldsProps {
  fields: ReturnType<typeof useGroupFields>;
  /** Under the description: where it shows. */
  descriptionHint: string;
}

/** The cover, name, description and other languages of a category or Mercadillo, inside the editor's form. */
export default function GroupFields({ fields, descriptionHint }: GroupFieldsProps) {
  const { t } = useI18n();
  const {
    form,
    shopLocale,
    otherLocales,
    shownLocale,
    setShownLocale,
    correctedLocales,
    ownText,
    textMode,
    chooseTextMode,
    coverInput,
    startUpload,
    shopName,
    translate,
    fillSlug,
    makeCover,
    isMakingCover,
    isTranslating,
    isImproving,
    isUploading,
  } = fields;
  const image = form.watch('image');
  const textModeTexts: TextModeTexts = {
    textModeQuestion: t('CATEGORY_TEXT_MODE_QUESTION'),
    textModeAi: t('CATEGORY_TEXT_MODE_AI'),
    textModeAiHint: t('CATEGORY_TEXT_MODE_AI_HINT'),
    textModeOriginal: t('CATEGORY_TEXT_MODE_ORIGINAL'),
    textModeOriginalHint: t('CATEGORY_TEXT_MODE_ORIGINAL_HINT'),
    textAiShort: t('CATEGORY_TEXT_MODE_AI'),
    textOriginalShort: t('CATEGORY_TEXT_MODE_ORIGINAL'),
  };

  // The "at least one language" check belongs to the whole name, not to one language's field.
  const errorOf = (field: 'name' | 'text') => {
    const message = form.formState.errors[field]?.message;
    return typeof message === 'string' ? translateMessage(t, message) : null;
  };

  const languageLabel = (locale: Locale) => LOCALES.find((option) => option.id === locale)?.label ?? locale;
  const languageName = (locale: Locale) => LOCALES.find((option) => option.id === locale)?.name ?? locale;

  return (
    <>
    <div className='grid gap-5 sm:grid-cols-[9rem_minmax(0,1fr)]'>
      <div className='flex flex-col items-center gap-2'>
        <div className='relative aspect-[3/4] w-36 overflow-hidden rounded-xl border border-border bg-muted'>
          {image ? (
            <ProductMedia src={image} alt={t('CATEGORY_FORM_COVER')} fill sizes='9rem' className='object-cover' />
          ) : (
            <span className='flex size-full flex-col items-center justify-center gap-2 p-3 text-center text-xs text-muted-foreground'>
              <ImageIcon className='size-7' aria-hidden /> {t('CATEGORY_FORM_COVER_EMPTY')}
            </span>
          )}
          {isMakingCover && (
            <span className='absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-sm'>
              <Loader2 className='size-6 animate-spin text-primary' />
            </span>
          )}
        </div>
        <Button type='button' variant={image ? 'outline' : 'default'} size='sm' className='h-auto min-h-8 w-36 whitespace-normal rounded-full py-1.5' disabled={isMakingCover || !shopName} onClick={makeCover}>
          {isMakingCover ? <Loader2 className='animate-spin' /> : <Sparkles />}
          {t(isMakingCover ? 'CATEGORY_FORM_COVER_WORKING' : image ? 'CATEGORY_FORM_COVER_AGAIN' : 'CATEGORY_FORM_COVER_AI')}
        </Button>
        <p className='w-36 text-center text-[0.7rem] leading-4 text-muted-foreground'>{t('CATEGORY_FORM_COVER_HINT')}</p>
        {/* Your own picture is the exception, so it is a quiet link under the AI button. */}
        <input
          ref={coverInput}
          type='file'
          accept='image/*'
          hidden
          onChange={async (event) => {
            const files = Array.from(event.target.files ?? []);
            event.target.value = '';
            if (files.length > 0) await startUpload(await preparePhotos(files));
          }}
        />
        <button
          type='button'
          disabled={isUploading || isMakingCover}
          onClick={() => coverInput.current?.click()}
          className='inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs text-primary underline-offset-4 hover:underline disabled:opacity-60'
        >
          {isUploading && <Loader2 className='size-3.5 animate-spin' />} {t('CATEGORY_FORM_COVER_UPLOAD')}
        </button>
      </div>

      <div className='space-y-4'>
        <FormField
          control={form.control}
          name={`name.${shopLocale}`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t('CATEGORY_FORM_NAME_SHORT')} · {languageName(shopLocale)}
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={field.value ?? ''}
                  className='h-11 text-lg'
                  onBlur={(event) => {
                    field.onBlur();
                    fillSlug(event.target.value);
                    translate(false);
                  }}
                />
              </FormControl>
              <FormMessage>{errorOf('name')}</FormMessage>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name={`text.${shopLocale}`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('CATEGORY_FORM_DESCRIPTION')}</FormLabel>
              <FormControl>
                <div className='relative'>
                  <Textarea
                    rows={4}
                    className='resize-none'
                    {...field}
                    value={field.value ?? ''}
                    readOnly={isImproving}
                    onChange={(event) => {
                      // Edits to the AI's text stay the AI's version; only the admin's own words are kept for "as is".
                      if (textMode === 'original') ownText.current = event.target.value;
                      field.onChange(event);
                    }}
                    onBlur={() => {
                      field.onBlur();
                      translate(false);
                    }}
                  />
                  {isImproving && (
                    <span className='absolute inset-0 flex items-center justify-center gap-2 rounded-md bg-background/80 text-sm font-medium backdrop-blur-sm'>
                      <Loader2 className='size-4 animate-spin text-primary' /> {t('CATEGORY_FORM_IMPROVING')}
                    </span>
                  )}
                </div>
              </FormControl>
              <p className='text-xs text-muted-foreground'>{descriptionHint}</p>
              <FormMessage>{errorOf('text')}</FormMessage>
            </FormItem>
          )}
        />
        <div className='space-y-2'>
          <p className='text-sm font-medium'>{t('CATEGORY_TEXT_MODE_QUESTION')}</p>
          <TextModeSwitch value={textMode} onChange={chooseTextMode} texts={textModeTexts} disabled={isImproving || isTranslating || !shopName} />
        </div>
      </div>
    </div>

    {shownLocale && (
      <section className='space-y-3 rounded-2xl border border-border p-3'>
        <div className='flex flex-wrap items-center gap-2'>
          <span className='mr-auto text-sm font-medium'>{t('CATEGORY_FORM_TRANSLATIONS')}</span>
          {isTranslating ? (
            <span className='flex items-center gap-1.5 text-xs text-muted-foreground' aria-live='polite'>
              <Loader2 className='size-3.5 animate-spin' /> {t('CATEGORY_FORM_TRANSLATING')}
            </span>
          ) : (
            <Button type='button' variant='ghost' size='sm' className='h-8 rounded-full' onClick={() => translate(true)}>
              <Languages /> {t('CATEGORY_FORM_TRANSLATE_AGAIN')}
            </Button>
          )}
        </div>
        <div role='tablist' aria-label={t('CATEGORY_FORM_TRANSLATIONS')} className='flex flex-wrap gap-1'>
          {otherLocales.map((locale) => (
            <button
              key={locale}
              type='button'
              role='tab'
              aria-selected={locale === shownLocale}
              title={languageName(locale)}
              onClick={() => setShownLocale(locale)}
              className={cn(
                'min-w-11 rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                locale === shownLocale ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              {languageLabel(locale)}
            </button>
          ))}
        </div>
        {/* One language at a time; a correction by hand stays when the others are translated again. */}
        <div key={shownLocale} role='tabpanel' className='space-y-2'>
          <FormField
            control={form.control}
            name={`name.${shownLocale}`}
            render={({ field }) => (
              <FormItem>
                <FormLabel className='sr-only'>{t('CATEGORY_FORM_NAME', { language: languageName(shownLocale) })}</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value ?? ''}
                    onChange={(event) => {
                      correctedLocales.current.add(shownLocale);
                      field.onChange(event);
                    }}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name={`text.${shownLocale}`}
            render={({ field }) => (
              <FormItem>
                <FormLabel className='sr-only'>{t('CATEGORY_FORM_TEXT', { language: languageName(shownLocale) })}</FormLabel>
                <FormControl>
                  <Textarea
                    rows={2}
                    className='resize-none'
                    {...field}
                    value={field.value ?? ''}
                    onChange={(event) => {
                      correctedLocales.current.add(shownLocale);
                      field.onChange(event);
                    }}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
      </section>
    )}
    </>
  );
}
