'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useI18n } from '@/components/i18n-provider';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { updateContactVisibility } from '@/lib/actions/settings.actions';
import type { TranslationKey } from '@/lib/i18n-core';
import { type ContactVisibility, contactVisibilitySchema } from '@/lib/validators';

interface ContactDetail {
  field: keyof ContactVisibility;
  label: TranslationKey;
  /** As set in .env, e.g. the email address. */
  value: string;
}

interface ContactVisibilityFormProps {
  visibility: ContactVisibility;
  /** Only the details .env has; the others can't show anyway. */
  details: ContactDetail[];
}

/** A checkbox per contact detail: unticked ones disappear from the footer, the contact section and the hero.
    Not on the dashboard for now: the SHOW_CONTACT_* switches in .env decide (lib/brand.ts); kept to bring back later. */
const ContactVisibilityForm = ({ visibility, details }: ContactVisibilityFormProps) => {
  const { t } = useI18n();
  const { toast } = useToast();
  const form = useForm<ContactVisibility>({ resolver: zodResolver(contactVisibilitySchema), defaultValues: visibility });

  const onSubmit = async (values: ContactVisibility) => {
    const result = await updateContactVisibility(values);
    toast({ variant: result.success ? 'default' : 'destructive', description: result.message });
    if (result.success) form.reset(values);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
        <div className='space-y-3'>
          {details.map((detail) => (
            <FormField
              key={detail.field}
              control={form.control}
              name={detail.field}
              render={({ field }) => (
                <FormItem className='flex items-center gap-2 space-y-0'>
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(checked === true)} />
                  </FormControl>
                  <FormLabel>
                    {t(detail.label)} <span className='font-normal text-muted-foreground'>· {detail.value}</span>
                  </FormLabel>
                </FormItem>
              )}
            />
          ))}
        </div>

        <Button type='submit' disabled={form.formState.isSubmitting || !form.formState.isDirty}>
          {form.formState.isSubmitting && <Loader2 className='animate-spin' />}
          {t('SETTINGS_SAVE')}
        </Button>
      </form>
    </Form>
  );
};

export default ContactVisibilityForm;
