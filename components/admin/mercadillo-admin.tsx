'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { ImageIcon, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import GroupFields, { useGroupFields } from '@/components/admin/group-fields';
import MercadilloListings, { type PickableListing } from '@/components/admin/mercadillo-listings';
import type { SearchChoice } from '@/components/shared/explore-search';
import { useI18n } from '@/components/i18n-provider';
import DeleteDialog from '@/components/shared/delete-dialog';
import { MercadilloIcon } from '@/components/shared/mercadillo-row';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { createMercadillo, deleteMercadillo, updateMercadillo } from '@/lib/actions/mercadillo.actions';
import { localize, type LocalizedText } from '@/lib/localize';
import { translateMessage, type Locale } from '@/lib/i18n-core';
import { preparePhotos } from '@/lib/prepare-photos';
import { useUploadThing } from '@/lib/uploadthing';
import { mercadilloSchema } from '@/lib/validators';

export interface EditableMercadillo {
  id: string;
  slug: string;
  name: LocalizedText;
  text: LocalizedText;
  image: string | null;
  icon: string | null;
  contactPhone: string | null;
  productCount: number;
  /** Its listings, chosen here or in each listing's editor. */
  productIds: string[];
}

interface MercadilloEditorProps {
  locales: Locale[];
  /** The Mercadillo to edit; a new one is made without it. */
  mercadillo?: EditableMercadillo;
  listings: PickableListing[];
  searchChoices: SearchChoice[];
  searchTags: SearchChoice[];
  mercadilloNames: Record<string, string>;
  onClose: () => void;
  onSaved: () => void;
}

/** Dialog to make or change a Mercadillo. */
function MercadilloEditor({ locales, mercadillo, listings, searchChoices, searchTags, mercadilloNames, onClose, onSaved }: MercadilloEditorProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const form = useForm<z.infer<typeof mercadilloSchema>>({
    resolver: zodResolver(mercadilloSchema),
    defaultValues: { slug: mercadillo?.slug ?? '', name: mercadillo?.name ?? {}, text: mercadillo?.text ?? {}, image: mercadillo?.image ?? null, icon: mercadillo?.icon ?? null, contactPhone: mercadillo?.contactPhone ?? '', productIds: mercadillo?.productIds ?? [] },
  });
  const fields = useGroupFields(form, { locales, group: mercadillo });
  const icon = form.watch('icon');
  const productIds = form.watch('productIds') ?? [];
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
    <Dialog open onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className='max-h-[90dvh] overflow-y-auto sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle>{t(mercadillo ? 'MERCADILLO_EDIT' : 'MERCADILLO_NEW')}</DialogTitle>
          <DialogDescription>{t('GROUP_FORM_INTRO_SIMPLE')}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className='space-y-5'>
            <GroupFields fields={fields} descriptionHint={t('MERCADILLO_DESCRIPTION_HINT')} />
            <MercadilloListings
              mercadilloId={mercadillo?.id}
              listings={listings}
              choices={searchChoices}
              tags={searchTags}
              mercadilloNames={mercadilloNames}
              chosenIds={productIds}
              onChange={(ids) => form.setValue('productIds', ids, { shouldDirty: true })}
            />
            <div className='flex items-center gap-3'>
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
              <Button type='button' variant='outline' size='sm' className='rounded-full' disabled={isUploadingIcon} onClick={() => iconInput.current?.click()}>
                {isUploadingIcon ? <Loader2 className='animate-spin' /> : <ImageIcon />} {t('MERCADILLO_ICON_UPLOAD')}
              </Button>
              {icon && (
                <Button type='button' variant='ghost' size='sm' className='rounded-full' onClick={() => form.setValue('icon', null, { shouldDirty: true })}>
                  {t('MERCADILLO_ICON_REMOVE')}
                </Button>
              )}
            </div>
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
              <Button type='button' variant='ghost' onClick={onClose}>
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
}

/** The list of Mercadillos, each with its product count, to edit or delete, and the way to make a new one. */
export default function MercadilloAdmin({ locale, locales, mercadillos, listings, searchChoices, searchTags }: MercadilloAdminProps) {
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
              <Link href={`/explore?mercadillo=${mercadillo.slug}`} className='min-w-0 flex-1 hover:underline'>
                <p className='truncate font-medium'>{localize(mercadillo.name, locale)}</p>
                <p className='text-sm text-muted-foreground'>{mercadillo.productCount === 1 ? t('MERCADILLO_COUNT_ONE') : t('MERCADILLO_COUNT', { count: mercadillo.productCount })}</p>
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
