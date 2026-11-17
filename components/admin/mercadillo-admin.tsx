'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { Loader2, Pencil, Plus, Tag, Trash2 } from 'lucide-react';
import GroupFields, { useGroupFields } from '@/components/admin/group-fields';
import MercadilloListings, { type PickableListing } from '@/components/admin/mercadillo-listings';
import MercadilloTags, { type TagOption } from '@/components/admin/mercadillo-tags';
import type { SearchChoice } from '@/components/shared/explore-search';
import { useI18n } from '@/components/i18n-provider';
import DeleteDialog from '@/components/shared/delete-dialog';
import LeaveGuard from '@/components/marketplace/leave-guard';
import { MercadilloIcon } from '@/components/shared/mercadillo-row';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { createMercadillo, deleteMercadillo, updateMercadillo } from '@/lib/actions/mercadillo.actions';
import { localize, type LocalizedText } from '@/lib/localize';
import { adminTexts, type AdminTexts } from '@/lib/marketplace/admin-texts';
import { translateMessage, type Locale } from '@/lib/i18n-core';
import { preparePhotos } from '@/lib/prepare-photos';
import { useUploadThing } from '@/lib/uploadthing';
import { mercadilloSchema } from '@/lib/validators';

export interface EditableMercadillo {
  id: string;
  slug: string;
  name: LocalizedText;
  text: LocalizedText;
  icon: string | null;
  contactPhone: string | null;
  productCount: number;
  /** Its listings, chosen here or in each listing's editor. */
  productIds: string[];
  /** Its etiquetas: every listing with one is in it too. */
  tagIds: string[];
}

interface MercadilloEditorProps {
  locales: Locale[];
  /** The Mercadillo to edit; a new one is made without it. */
  mercadillo?: EditableMercadillo;
  listings: PickableListing[];
  searchChoices: SearchChoice[];
  searchTags: SearchChoice[];
  mercadilloNames: Record<string, string>;
  tagOptions: TagOption[];
  texts: AdminTexts;
  onClose: () => void;
  onSaved: () => void;
}

/** Dialog to make or change a selección. */
function MercadilloEditor({ locales, mercadillo, listings, searchChoices, searchTags, mercadilloNames, tagOptions, texts, onClose, onSaved }: MercadilloEditorProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const form = useForm<z.infer<typeof mercadilloSchema>>({
    resolver: zodResolver(mercadilloSchema),
    defaultValues: { slug: mercadillo?.slug ?? '', name: mercadillo?.name ?? {}, text: mercadillo?.text ?? {}, icon: mercadillo?.icon ?? null, contactPhone: mercadillo?.contactPhone ?? '', productIds: mercadillo?.productIds ?? [], tagIds: mercadillo?.tagIds ?? [] },
  });
  const fields = useGroupFields(form, { locales, group: mercadillo });
  const icon = form.watch('icon');
  const productIds = form.watch('productIds') ?? [];
  const tagIds = form.watch('tagIds') ?? [];
  const [isAskingToLeave, setIsAskingToLeave] = useState(false);
  // Closing with changes asks first, as the listing editor does; without changes it just closes.
  const requestClose = () => (form.formState.isDirty ? setIsAskingToLeave(true) : onClose());
  const tagNames = Object.fromEntries(tagOptions.filter((tag) => tagIds.includes(tag.id)).map((tag) => [tag.id, tag.name]));
  const iconInput = useRef<HTMLInputElement>(null);
  const { startUpload: uploadIcon, isUploading: isUploadingIcon } = useUploadThing('imageUploader', {
    onClientUploadComplete: (files) => {
      if (files[0]) form.setValue('icon', files[0].ufsUrl, { shouldDirty: true });
    },
    onUploadError: () => {
      toast({ variant: 'destructive', description: t('STUDIO_UPLOAD_FAILED') });
    },
  });

  const handleSubmit = async () => {
    await fields.translateBeforeSave();
    const values = form.getValues();
    const result = mercadillo ? await updateMercadillo({ ...values, id: mercadillo.id }) : await createMercadillo(values);
    if (!result.success) return toast({ variant: 'destructive', description: translateMessage(t, result.message) });
    toast({ description: translateMessage(t, result.message) });
    onSaved();
  };

  return (
    <Dialog open onOpenChange={(isOpen) => !isOpen && requestClose()}>
      {/* A click beside the window doesn't close it: only the ×, Cancelar or Esc, which ask first. */}
      <DialogContent className='max-h-[90dvh] overflow-y-auto sm:max-w-2xl' onInteractOutside={(event) => event.preventDefault()}>
        <LeaveGuard hasWork={form.formState.isDirty} texts={texts} />
        <AlertDialog open={isAskingToLeave} onOpenChange={setIsAskingToLeave}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{texts.leaveTitle}</AlertDialogTitle>
              <AlertDialogDescription>{texts.leaveText}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{texts.leaveStay}</AlertDialogCancel>
              <AlertDialogAction onClick={onClose}>{texts.leaveGo}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <DialogHeader>
          <DialogTitle>{t(mercadillo ? 'MERCADILLO_EDIT' : 'MERCADILLO_NEW')}</DialogTitle>
          <DialogDescription>{t('GROUP_FORM_INTRO_SIMPLE')}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className='space-y-5'>
            <GroupFields
              fields={fields}
              descriptionHint={t('MERCADILLO_DESCRIPTION_HINT')}
              aside={
                <div className='flex w-16 shrink-0 flex-col items-center gap-1 pt-1'>
                  <MercadilloIcon src={icon} className='size-14' />
                  <input
                    ref={iconInput}
                    type='file'
                    accept='image/*'
                    hidden
                    onChange={async (event) => {
                      const files = Array.from(event.target.files ?? []);
                      event.target.value = '';
                      if (files.length > 0) await uploadIcon(await preparePhotos(files));
                    }}
                  />
                  <button type='button' disabled={isUploadingIcon} onClick={() => iconInput.current?.click()} className='text-center text-xs leading-4 text-primary hover:underline disabled:opacity-60'>
                    {isUploadingIcon ? <Loader2 className='size-3.5 animate-spin' /> : t('MERCADILLO_ICON_UPLOAD')}
                  </button>
                  {icon && (
                    <button type='button' onClick={() => form.setValue('icon', null, { shouldDirty: true })} className='text-xs text-muted-foreground hover:underline'>
                      {t('MERCADILLO_ICON_REMOVE')}
                    </button>
                  )}
                </div>
              }
            />
            <MercadilloTags tags={tagOptions} chosenIds={tagIds} onChange={(ids) => form.setValue('tagIds', ids, { shouldDirty: true })} />
            <MercadilloListings
              mercadilloId={mercadillo?.id}
              listings={listings}
              choices={searchChoices}
              tags={searchTags}
              mercadilloNames={mercadilloNames}
              chosenIds={productIds}
              onChange={(ids) => form.setValue('productIds', ids, { shouldDirty: true })}
              tagNames={tagNames}
            />
            <FormField
              control={form.control}
              name='contactPhone'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('MERCADILLO_CONTACT_PHONE')}</FormLabel>
                  <FormControl>
                    <Input type='tel' inputMode='tel' placeholder='+34 600 000 000' {...field} />
                  </FormControl>
                  <p className='text-xs text-muted-foreground'>{t('MERCADILLO_CONTACT_PHONE_HINT')}</p>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='slug'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('GROUP_FORM_SLUG')}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className='sticky bottom-0 -mx-6 -mb-6 flex justify-end gap-2 border-t border-border bg-background/95 px-6 py-4 backdrop-blur'>
              <Button type='button' variant='ghost' onClick={requestClose}>
                {t('DELETE_DIALOG_CANCEL')}
              </Button>
              {/* Keeps the focus: leaving a text field starts a translation, which would disable this button mid-click. */}
              <Button type='submit' onMouseDown={(event) => event.preventDefault()} disabled={form.formState.isSubmitting || fields.isBusy || isUploadingIcon}>
                {form.formState.isSubmitting && <Loader2 className='animate-spin' />}
                {t('MERCADILLO_SAVE')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

interface MercadilloAdminProps {
  locale: Locale;
  /** The shop's language first. */
  locales: Locale[];
  mercadillos: EditableMercadillo[];
  /** Every online listing, to choose a Mercadillo's from. */
  listings: PickableListing[];
  /** The kinds and etiquetas its search offers, as on /explore. */
  searchChoices: SearchChoice[];
  searchTags: SearchChoice[];
  /** Every etiqueta a selección can hold. */
  tagOptions: TagOption[];
}

/** The list of selecciones, each with its product count, to edit or delete, and the way to make a new one. */
export default function MercadilloAdmin({ locale, locales, mercadillos, listings, searchChoices, searchTags, tagOptions }: MercadilloAdminProps) {
  const { t } = useI18n();
  const router = useRouter();
  // 'new': the editor makes one; a Mercadillo: it changes that one.
  const [editing, setEditing] = useState<EditableMercadillo | 'new' | null>(null);
  const mercadilloNames = Object.fromEntries(mercadillos.map((mercadillo) => [mercadillo.id, localize(mercadillo.name, locale)]));

  return (
    <div className='space-y-4'>
      <Button className='rounded-full' onClick={() => setEditing('new')}>
        <Plus /> {t('MERCADILLO_NEW')}
      </Button>
      {mercadillos.length === 0 ? (
        <p className='rounded-3xl border border-dashed border-border p-12 text-center text-muted-foreground'>{t('MERCADILLO_EMPTY')}</p>
      ) : (
        <ul className='space-y-3'>
          {mercadillos.map((mercadillo) => (
            <li key={mercadillo.id} className='flex items-center gap-3 rounded-2xl border border-border bg-card p-3'>
              <MercadilloIcon src={mercadillo.icon} className='size-12' />
              <Link href={`/explore?seleccion=${mercadillo.slug}`} className='min-w-0 flex-1 hover:underline'>
                <p className='truncate font-medium'>{localize(mercadillo.name, locale)}</p>
                <p className='text-sm text-muted-foreground'>{mercadillo.productCount === 1 ? t('MERCADILLO_COUNT_ONE') : t('MERCADILLO_COUNT', { count: mercadillo.productCount })}</p>
                {mercadillo.tagIds.length > 0 && (
                  <span className='mt-1 flex flex-wrap gap-1'>
                    {tagOptions
                      .filter((tag) => mercadillo.tagIds.includes(tag.id))
                      .map((tag) => (
                        <span key={tag.id} className='inline-flex items-center gap-1 rounded-full border border-accent/60 bg-accent/20 px-2 py-0.5 text-xs'>
                          <Tag className='size-3' aria-hidden /> {tag.name}
                        </span>
                      ))}
                  </span>
                )}
                <p className='break-all text-xs text-muted-foreground'>{mercadillo.slug}</p>
              </Link>
              <Button variant='ghost' size='icon' className='shrink-0 rounded-full' aria-label={t('MERCADILLO_EDIT')} onClick={() => setEditing(mercadillo)}>
                <Pencil />
              </Button>
              <DeleteDialog
                id={mercadillo.id}
                action={deleteMercadillo}
                description={t('MERCADILLO_DELETE_HINT')}
                trigger={
                  <Button variant='ghost' size='icon' className='shrink-0 rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive' aria-label={t('DELETE_DIALOG_CONFIRM')}>
                    <Trash2 />
                  </Button>
                }
              />
            </li>
          ))}
        </ul>
      )}
      {editing && (
        <MercadilloEditor
          key={editing === 'new' ? 'new' : editing.id}
          locales={locales}
          mercadillo={editing === 'new' ? undefined : editing}
          listings={listings}
          searchChoices={searchChoices}
          searchTags={searchTags}
          mercadilloNames={mercadilloNames}
          tagOptions={tagOptions}
          texts={adminTexts(locale)}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
