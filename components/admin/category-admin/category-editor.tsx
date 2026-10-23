'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import slugify from 'slugify';
import { z } from 'zod';
import { Loader2, Sparkles } from 'lucide-react';
import ProductMedia from '@/components/ProductMedia';
import { useI18n } from '@/components/i18n-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { createCategory, updateCategory } from '@/lib/actions/category.actions';
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

/** Dialog to make or change a store category: names, texts, materials, the AI photo scene and the cover. */
const CategoryEditor = ({ locales, category, onClose, onSaved }: CategoryEditorProps) => {
  const { t } = useI18n();
  const { toast } = useToast();
  const [isMakingCover, setIsMakingCover] = useState(false);
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: toFormValues(category),
  });
  const image = form.watch('image');

  const handleSubmit = async (values: CategoryFormValues) => {
    const data = {
      ...values,
      keywords: splitList(values.keywords, ','),
      sceneVariants: splitList(values.sceneVariants, /\n/),
    };
    const result = category ? await updateCategory({ ...data, id: category.id }) : await createCategory(data);
    if (!result.success) return toast({ variant: 'destructive', description: result.message });
    toast({ description: result.message });
    const staleRingIds: string[] = 'ringIds' in result && Array.isArray(result.ringIds) ? result.ringIds : [];
    onSaved(staleRingIds);
  };

  // A new category gets its link name from its first name.
  const fillSlug = (name: string) => {
    if (!category && !form.getValues('slug')) form.setValue('slug', slugify(name, { lower: true, strict: true }));
  };

  const makeCover = async () => {
    setIsMakingCover(true);
    const result = await generateCategoryCover(form.getValues('scene'));
    setIsMakingCover(false);
    if (!result.success || !result.url) return toast({ variant: 'destructive', description: result.message });
    form.setValue('image', result.url, { shouldDirty: true });
  };

  // The "at least one language" check belongs to the whole name or text, not to one language's field.
  const errorOf = (field: 'name' | 'text') => {
    const message = form.formState.errors[field]?.message;
    return typeof message === 'string' ? translateMessage(t, message) : null;
  };

  const languageName = (locale: Locale) => LOCALES.find((option) => option.id === locale)?.name ?? locale;

  return (
    <Dialog open onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className='max-h-[90dvh] overflow-y-auto sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle>{t(category ? 'CATEGORY_FORM_TITLE_EDIT' : 'CATEGORY_FORM_TITLE_NEW')}</DialogTitle>
          <DialogDescription>{t('CATEGORY_FORM_INTRO')}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className='space-y-5'>
            {locales.map((locale, index) => (
              <div key={locale} className='grid gap-3 sm:grid-cols-[1fr_2fr]'>
                <FormField
                  control={form.control}
                  name={`name.${locale}`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('CATEGORY_FORM_NAME', { language: languageName(locale) })}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value ?? ''}
                          onBlur={(event) => {
                            field.onBlur();
                            if (index === 0) fillSlug(event.target.value);
                          }}
                        />
                      </FormControl>
                      {index === 0 && <FormMessage>{errorOf('name')}</FormMessage>}
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`text.${locale}`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('CATEGORY_FORM_TEXT', { language: languageName(locale) })}</FormLabel>
                      <FormControl>
                        <Textarea rows={2} className='resize-none' {...field} value={field.value ?? ''} />
                      </FormControl>
                      {index === 0 && <FormMessage>{errorOf('text')}</FormMessage>}
                    </FormItem>
                  )}
                />
              </div>
            ))}

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

            <div className='space-y-2'>
              <p className='text-sm font-medium'>{t('CATEGORY_FORM_COVER')}</p>
              <div className='flex flex-wrap items-end gap-4'>
                <div className='relative aspect-[3/4] w-28 overflow-hidden rounded-lg border border-border bg-muted'>
                  {image && <ProductMedia src={image} alt={t('CATEGORY_FORM_COVER')} fill sizes='7rem' className='object-cover' />}
                </div>
                <div className='flex flex-col gap-2'>
                  <Button type='button' variant='outline' disabled={isMakingCover} onClick={makeCover}>
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
              </div>
            </div>

            <div className='flex justify-end gap-2'>
              <Button type='button' variant='ghost' onClick={onClose}>
                {t('DELETE_DIALOG_CANCEL')}
              </Button>
              <Button type='submit' disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className='animate-spin' />}
                {t('CATEGORY_FORM_SAVE')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default CategoryEditor;
