'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { ChevronDown, Loader2 } from 'lucide-react';
import GroupFields, { useGroupFields } from '@/components/admin/group-fields';
import { useI18n } from '@/components/i18n-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { createCategory, updateCategory } from '@/lib/actions/category.actions';
import type { EditableCategory } from '@/lib/category';
import { translateMessage, type Locale } from '@/lib/i18n-core';
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
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: toFormValues(category),
  });
  const fields = useGroupFields(form, { locales, group: category, coverFallback: () => form.getValues('scene') });
  const { shopLocale, translateBeforeSave, makeCover, isMakingCover, isBusy } = fields;

  const handleSubmit = async () => {
    await translateBeforeSave();
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

  return (
    <Dialog open onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className='max-h-[90dvh] overflow-y-auto sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle>{t(category ? 'CATEGORY_FORM_TITLE_EDIT' : 'CATEGORY_FORM_TITLE_NEW')}</DialogTitle>
          <DialogDescription>{t('CATEGORY_FORM_INTRO_SIMPLE')}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className='space-y-5'>
            <GroupFields fields={fields} descriptionHint={t('CATEGORY_FORM_DESCRIPTION_HINT_AI')} />

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
              {/* Keeps the focus: leaving a text field starts a translation, which would disable this button mid-click. */}
              <Button type='submit' onMouseDown={(event) => event.preventDefault()} disabled={form.formState.isSubmitting || isBusy}>
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
