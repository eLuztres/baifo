'use client';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { updateProfile } from '@/lib/actions/user.actions';
import { updateProfileSchema } from '@/lib/validators';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useI18n } from '@/components/i18n-provider';

interface ProfileFormProps {
  name: string;
  email: string;
}

const ProfileForm = ({ name, email }: ProfileFormProps) => {
  const { t } = useI18n();
  const router = useRouter();

  const form = useForm<z.infer<typeof updateProfileSchema>>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      name,
      email,
    },
  });

  const { toast } = useToast();

  const onSubmit = async (values: z.infer<typeof updateProfileSchema>) => {
    const res = await updateProfile(values);

    if (!res.success) {
      return toast({
        variant: 'destructive',
        description: res.message,
      });
    }

    // Re-renders the header with the new name.
    router.refresh();

    toast({
      description: res.message,
    });
  };

  return (
    <Form {...form}>
      <form
        className='flex flex-col gap-5'
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <div className='flex flex-col gap-5'>
          <FormField
            control={form.control}
            name='email'
            render={({ field }) => (
              <FormItem className='w-full'>
                <FormControl>
                  <Input
                    disabled
                    placeholder={t('FIELD_EMAIL')}
                    aria-label={t('FIELD_EMAIL')}
                    className='input-field'
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name='name'
            render={({ field }) => (
              <FormItem className='w-full'>
                <FormControl>
                  <Input
                    placeholder={t('FIELD_NAME')}
                    aria-label={t('FIELD_NAME')}
                    autoComplete='name'
                    className='input-field'
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <Button
          type='submit'
          size='lg'
          className='button col-span-2 w-full'
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? t('FORM_SAVING') : t('PROFILE_UPDATE')}
        </Button>
      </form>
    </Form>
  );
};

export default ProfileForm;
