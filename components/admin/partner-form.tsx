'use client';

import { useRef } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { Loader2 } from 'lucide-react';
import GroupFields, { useGroupFields } from '@/components/admin/group-fields';
import { useI18n } from '@/components/i18n-provider';
import LeaveGuard from '@/components/marketplace/leave-guard';
import { MercadilloIcon } from '@/components/shared/mercadillo-row';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { createPartner, updateOwnPartner, updatePartner } from '@/lib/actions/partner.actions';
import { translateMessage, type Locale } from '@/lib/i18n-core';
import type { LocalizedText } from '@/lib/localize';
import type { AdminTexts } from '@/lib/marketplace/admin-texts';
import { preparePhotos } from '@/lib/prepare-photos';
import { useUploadThing } from '@/lib/uploadthing';
import { partnerSchema } from '@/lib/validators';

export interface EditablePartner {
  id: string;
  slug: string;
  name: LocalizedText;
  text: LocalizedText;
  icon: string | null;
  contactPhone: string | null;
  maxListings: number;
}

interface PartnerFormProps {
  /** The shop's language first. */
  locales: Locale[];
  /** The mercadillo to change; the admin makes a new one without it. */
  partner?: EditablePartner;
  /** The admin also sets its link name and how many listings it can have; the partner changes only its own details. */
  isAdminForm: boolean;
  texts: AdminTexts;
  onSaved: () => void;
  /** Cancelar; it isn't shown without it. */
  onCancel?: () => void;
}

const DEFAULT_MAX_LISTINGS = 20;

/** A partner's mercadillo: its name and words in every language, its sign and its WhatsApp; for the admin also its link name and limit. */
export default function PartnerForm({ locales, partner, isAdminForm, texts, onSaved, onCancel }: PartnerFormProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  // One schema for both: the partner's link name and limit come along unchanged, and its own save ignores them.
  const form = useForm<z.infer<typeof partnerSchema>>({
    resolver: zodResolver(partnerSchema),
    defaultValues: {
      slug: partner?.slug ?? '',
      name: partner?.name ?? {},
      text: partner?.text ?? {},
      icon: partner?.icon ?? null,
      contactPhone: partner?.contactPhone ? `+${partner.contactPhone}` : '',
      maxListings: partner?.maxListings ?? DEFAULT_MAX_LISTINGS,
    },
  });
  const fields = useGroupFields(form, { locales, group: partner });
  const icon = form.watch('icon');
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
    const result = !isAdminForm ? await updateOwnPartner(values) : partner ? await updatePartner({ ...values, id: partner.id }) : await createPartner(values);
    if (!result.success) return toast({ variant: 'destructive', description: translateMessage(t, result.message) });
    toast({ description: translateMessage(t, result.message) });
    // Saved: leaving now loses nothing.
    form.reset(values);
    onSaved();
  };

  return (
    <Form {...form}>
      <LeaveGuard hasWork={form.formState.isDirty} texts={texts} />
      <form onSubmit={form.handleSubmit(handleSubmit)} className='space-y-5'>
        <GroupFields
          fields={fields}
          descriptionHint={t('PARTNER_DESCRIPTION_HINT')}
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
        <FormField
          control={form.control}
          name='contactPhone'
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('MERCADILLO_CONTACT_PHONE')}</FormLabel>
              <FormControl>
                <Input type='tel' inputMode='tel' placeholder='+34 600 000 000' {...field} />
              </FormControl>
              <p className='text-xs text-muted-foreground'>{t(isAdminForm ? 'PARTNER_CONTACT_PHONE_HINT' : 'PARTNER_OWN_PHONE_HINT')}</p>
              <FormMessage />
            </FormItem>
          )}
        />
        {isAdminForm && (
          <div className='grid gap-4 sm:grid-cols-2'>
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
            <FormField
              control={form.control}
              name='maxListings'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('PARTNER_MAX_LISTINGS')}</FormLabel>
                  <FormControl>
                    <Input type='number' inputMode='numeric' min={1} max={500} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}
        <div className='flex justify-end gap-2'>
          {onCancel && (
            <Button type='button' variant='ghost' onClick={onCancel}>
              {t('DELETE_DIALOG_CANCEL')}
            </Button>
          )}
          {/* Keeps the focus: leaving a text field starts a translation, which would disable this button mid-click. */}
          <Button type='submit' className='rounded-full' onMouseDown={(event) => event.preventDefault()} disabled={form.formState.isSubmitting || fields.isBusy || isUploadingIcon}>
            {form.formState.isSubmitting && <Loader2 className='animate-spin' />}
            {t('PARTNER_SAVE')}
          </Button>
        </div>
      </form>
    </Form>
  );
}
