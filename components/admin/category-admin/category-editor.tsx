'use client';

import { useRef, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import slugify from 'slugify';
import { z } from 'zod';
import { ChevronDown, Languages, Loader2, Sparkles } from 'lucide-react';
import ProductMedia from '@/components/ProductMedia';
import { useI18n } from '@/components/i18n-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { createCategory, translateCategory, updateCategory } from '@/lib/actions/category.actions';
import { generateCategoryCover } from '@/lib/actions/studio.actions';
import type { EditableCategory } from '@/lib/category';
import { LOCALES, translateMessage, type Locale } from '@/lib/i18n-core';
import { preparePhotos } from '@/lib/prepare-photos';
import { UploadButton } from '@/lib/uploadthing';
import { categorySchema } from '@/lib/validators';

// The lists are typed as text (comma or line separated) and split on save.
const categoryFormSchema = categorySchema.extend({ keywords: z.string(), sceneVariants: z.string() });
type CategoryFormValues = z.infer<typeof categoryFormSchema>;

const splitList = (text: string, separator: string | RegExp) =>
  text
    .split(separator)
    .map((entry) => entry.trim())
    .filter(Boolean);

const toFormValues = (category?: EditableCategory): CategoryFormValues => ({
  slug: category?.slug ?? '',
  name: category?.name ?? {},
  text: category?.text ?? {},
  image: category?.image ?? null,
  keywords: category?.keywords.join(', ') ?? '',
  scene: category?.scene ?? '',
  sceneVariants: category?.sceneVariants.join('\n') ?? '',
});

interface CategoryEditorProps {
  locales: Locale[];
  /** The category to edit; a new one is made without it. */
  category?: EditableCategory;
  onClose: () => void;
  /** After saving; the ids are the rings whose photos no longer match a changed scene. */
  onSaved: (staleRingIds: string[]) => void;
}

/** Dialog to make or change a store category: the name in the shop's language (the others translate by themselves),
    an optional description, the cover (uploaded or made by the AI like the other covers), and the AI photo scene. */
const CategoryEditor = ({ locales, category, onClose, onSaved }: CategoryEditorProps) => {
  const { t } = useI18n();
  const { toast } = useToast();
  const [isMakingCover, setIsMakingCover] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: toFormValues(category),
  });
  const image = form.watch('image');
  // The admin writes in the shop's language (listed first); every other language is a compact tab.
  const [shopLocale, ...otherLocales] = locales;
  const [shownLocale, setShownLocale] = useState<Locale | undefined>(otherLocales[0]);
  // Languages the admin corrected by hand: a new automatic translation leaves them as they are.
  const correctedLocales = useRef(new Set<Locale>());
  // What was last translated, so leaving a field without changing it doesn't translate again.
  const lastTranslated = useRef(JSON.stringify([category?.name?.[shopLocale] ?? '', category?.text?.[shopLocale] ?? '']));

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

  const handleSubmit = async () => {
    // A language still without a name gets its translation before saving.
    if (otherLocales.some((locale) => !form.getValues(`name.${locale}`)?.trim())) await translate(true);
    // Only a description and no picture: the AI makes the cover from it before saving.
    if (!form.getValues('image') && form.getValues(`text.${shopLocale}`)?.trim()) await makeCover();
    const values = form.getValues();
    const data = {
      ...values,
      keywords: splitList(values.keywords, ','),
      sceneVariants: splitList(values.sceneVariants, /\n/),
    };
    const result = category ? await updateCategory({ ...data, id: category.id }) : await createCategory(data);
    if (!result.success) return toast({ variant: 'destructive', description: translateMessage(t, result.message) });
    toast({ description: translateMessage(t, result.message) });
    const staleRingIds: string[] = 'ringIds' in result && Array.isArray(result.ringIds) ? result.ringIds : [];
    onSaved(staleRingIds);
  };

  // A new category gets its link name from its first name.
  const fillSlug = (name: string) => {
    if (!category && !form.getValues('slug')) form.setValue('slug', slugify(name, { lower: true, strict: true }));
  };

  // The description says what the cover shows; a template shop without one still has its photo scene.
  const makeCover = async () => {
    setIsMakingCover(true);
    const description = form.getValues(`text.${shopLocale}`)?.trim() || form.getValues('scene');
    const result = await generateCategoryCover(description, form.getValues(`name.${shopLocale}`) ?? '');
    setIsMakingCover(false);
    if (!result.success || !result.url) return toast({ variant: 'destructive', description: translateMessage(t, result.message) });
    form.setValue('image', result.url, { shouldDirty: true });
  };

  // The "at least one language" check belongs to the whole name, not to one language's field.
  const errorOf = (field: 'name' | 'text') => {
    const message = form.formState.errors[field]?.message;
    return typeof message === 'string' ? translateMessage(t, message) : null;
  };

  const languageLabel = (locale: Locale) => LOCALES.find((option) => option.id === locale)?.label ?? locale;
  const languageName = (locale: Locale) => LOCALES.find((option) => option.id === locale)?.name ?? locale;

  return (
    <Dialog open onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className='max-h-[90dvh] overflow-y-auto sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle>{t(category ? 'CATEGORY_FORM_TITLE_EDIT' : 'CATEGORY_FORM_TITLE_NEW')}</DialogTitle>
          <DialogDescription>{t('CATEGORY_FORM_INTRO_SIMPLE')}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className='space-y-5'>
            <div className='grid gap-5 sm:grid-cols-[9rem_minmax(0,1fr)]'>
              <div className='flex flex-col items-center gap-2'>
                <div className='relative aspect-[3/4] w-36 overflow-hidden rounded-xl border border-border bg-muted'>
                  {image && <ProductMedia src={image} alt={t('CATEGORY_FORM_COVER')} fill sizes='9rem' className='object-cover' />}
                  {isMakingCover && (
                    <span className='absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-sm'>
                      <Loader2 className='size-6 animate-spin text-primary' />
                    </span>
                  )}
                </div>
                <Button type='button' variant='outline' size='sm' className='w-36 rounded-full' disabled={isMakingCover} onClick={makeCover}>
                  {isMakingCover ? <Loader2 className='animate-spin' /> : <Sparkles />}
                  {t(isMakingCover ? 'CATEGORY_FORM_COVER_WORKING' : 'CATEGORY_FORM_COVER_AI')}
                </Button>
                <UploadButton
                  endpoint='imageUploader'
                  onBeforeUploadBegin={preparePhotos}
                  onClientUploadComplete={(files) => {
                    if (files[0]) form.setValue('image', files[0].ufsUrl, { shouldDirty: true });
                  }}
                  onUploadError={() => {
                    toast({ variant: 'destructive', description: t('STUDIO_UPLOAD_FAILED') });
                  }}
                />
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
                        <Textarea
                          rows={4}
                          className='resize-none'
                          {...field}
                          value={field.value ?? ''}
                          onBlur={() => {
                            field.onBlur();
                            translate(false);
                          }}
                        />
                      </FormControl>
                      <p className='text-xs text-muted-foreground'>{t('CATEGORY_FORM_DESCRIPTION_HINT')}</p>
                      <FormMessage>{errorOf('text')}</FormMessage>
                    </FormItem>
                  )}
                />
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

            <details className='group rounded-2xl border border-border p-3'>
              <summary className='flex cursor-pointer list-none items-center justify-between text-sm font-medium'>
                {t('CATEGORY_FORM_ADVANCED')}
                <ChevronDown className='size-4 transition-transform group-open:rotate-180' aria-hidden />
              </summary>
              <div className='mt-4 space-y-4'>
                <div className='grid gap-3 sm:grid-cols-2'>
                  <FormField
                    control={form.control}
                    name='slug'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('CATEGORY_FORM_SLUG')}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name='keywords'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('CATEGORY_FORM_KEYWORDS')}</FormLabel>
                        <FormControl>
                          <Input placeholder={t('CATEGORY_FORM_KEYWORDS_PLACEHOLDER')} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name='scene'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('CATEGORY_FORM_SCENE')}</FormLabel>
                      <p className='text-xs text-muted-foreground'>{t('CATEGORY_FORM_SCENE_HINT')}</p>
                      <FormControl>
                        <Textarea rows={3} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='sceneVariants'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('CATEGORY_FORM_VARIANTS')}</FormLabel>
                      <FormControl>
                        <Textarea rows={3} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </details>

            <div className='sticky bottom-0 -mx-6 -mb-6 flex justify-end gap-2 border-t border-border bg-background/95 px-6 py-4 backdrop-blur'>
              <Button type='button' variant='ghost' onClick={onClose}>
                {t('DELETE_DIALOG_CANCEL')}
              </Button>
              <Button type='submit' disabled={form.formState.isSubmitting || isTranslating || isMakingCover}>
                {(form.formState.isSubmitting || isMakingCover) && <Loader2 className='animate-spin' />}
                {t(isMakingCover ? 'CATEGORY_FORM_COVER_WORKING' : 'CATEGORY_FORM_SAVE')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default CategoryEditor;
