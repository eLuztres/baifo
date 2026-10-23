'use client';

import { useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Mail, MessageCircle, Send } from 'lucide-react';
import { useI18n } from '@/components/i18n-provider';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { sendTestWhatsApp, updateShopSettings } from '@/lib/actions/settings.actions';
import { type ShopSettingsInput, shopSettingsSchema } from '@/lib/validators';

interface NotificationSettingsFormProps {
  settings: ShopSettingsInput;
  /** Where alerts go when the admin leaves the email field empty (.env). */
  defaultEmails: string;
}

const CALLMEBOT_HELP_URL = 'https://www.callmebot.com/blog/free-api-whatsapp-messages/';

/** Checkboxes for how the owner hears about orders and interested customers: email, WhatsApp, both or none. */
const NotificationSettingsForm = ({ settings, defaultEmails }: NotificationSettingsFormProps) => {
  const { t } = useI18n();
  const { toast } = useToast();
  const [isTesting, startTest] = useTransition();
  const form = useForm<ShopSettingsInput>({ resolver: zodResolver(shopSettingsSchema), defaultValues: settings });
  const isEmailOn = form.watch('notifyEmail');
  const isWhatsappOn = form.watch('notifyWhatsapp');

  const onSubmit = async (values: ShopSettingsInput) => {
    const result = await updateShopSettings(values);
    toast({ variant: result.success ? 'default' : 'destructive', description: result.message });
    if (result.success) form.reset(values);
  };

  const handleTest = () =>
    startTest(async () => {
      const { whatsappNumber, whatsappApiKey } = form.getValues();
      const result = await sendTestWhatsApp({ whatsappNumber, whatsappApiKey });
      toast({ variant: result.success ? 'default' : 'destructive', description: result.message });
    });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
        <div className='space-y-3'>
          <FormField
            control={form.control}
            name='notifyEmail'
            render={({ field }) => (
              <FormItem className='flex items-center gap-2 space-y-0'>
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(checked === true)} />
                </FormControl>
                <FormLabel className='flex items-center gap-2'>
                  <Mail className='size-4' />
                  {t('SETTINGS_NOTIFY_EMAIL')}
                </FormLabel>
              </FormItem>
            )}
          />
          {isEmailOn && (
            <FormField
              control={form.control}
              name='alertEmails'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('SETTINGS_ALERT_EMAILS')}</FormLabel>
                  <FormControl>
                    <Input type='text' inputMode='email' placeholder={defaultEmails} {...field} />
                  </FormControl>
                  <FormDescription>{t('SETTINGS_ALERT_EMAILS_HINT')}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        <div className='space-y-3'>
          <FormField
            control={form.control}
            name='notifyWhatsapp'
            render={({ field }) => (
              <FormItem className='flex items-center gap-2 space-y-0'>
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(checked === true)} />
                </FormControl>
                <FormLabel className='flex items-center gap-2'>
                  <MessageCircle className='size-4' />
                  {t('SETTINGS_NOTIFY_WHATSAPP')}
                </FormLabel>
              </FormItem>
            )}
          />
          {isWhatsappOn && (
            <div className='space-y-3'>
              <p className='text-sm text-muted-foreground'>
                {t('SETTINGS_WHATSAPP_HINT')}{' '}
                <a href={CALLMEBOT_HELP_URL} target='_blank' rel='noreferrer' className='text-primary underline'>
                  callmebot.com
                </a>
              </p>
              <div className='grid gap-3 md:grid-cols-2'>
                <FormField
                  control={form.control}
                  name='whatsappNumber'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('SETTINGS_WHATSAPP_NUMBER')}</FormLabel>
                      <FormControl>
                        <Input type='tel' placeholder='+34 600 000 000' {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='whatsappApiKey'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('SETTINGS_WHATSAPP_API_KEY')}</FormLabel>
                      <FormControl>
                        <Input type='password' autoComplete='off' {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <Button type='button' variant='outline' size='sm' onClick={handleTest} disabled={isTesting}>
                {isTesting ? <Loader2 className='animate-spin' /> : <Send />}
                {t('SETTINGS_WHATSAPP_TEST')}
              </Button>
            </div>
          )}
        </div>

        {!isEmailOn && !isWhatsappOn && <p className='text-sm text-muted-foreground'>{t('SETTINGS_NOTIFY_NONE')}</p>}

        <Button type='submit' disabled={form.formState.isSubmitting || !form.formState.isDirty}>
          {form.formState.isSubmitting && <Loader2 className='animate-spin' />}
          {t('SETTINGS_SAVE')}
        </Button>
      </form>
    </Form>
  );
};

export default NotificationSettingsForm;
