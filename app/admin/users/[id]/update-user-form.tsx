'use client';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/components/i18n-provider';
import { roleLabel } from '@/components/admin/role-label';
import { updateUser } from '@/lib/actions/user.actions';
import { updateUserSchema } from '@/lib/validators';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { ControllerRenderProps, useForm } from 'react-hook-form';
import { z } from 'zod';

interface UpdateUserFormProps {
  user: z.infer<typeof updateUserSchema>;
  /** The shop's USER_ROLES (server env). */
  roles: string[];
}

const UpdateUserForm = ({ user, roles }: UpdateUserFormProps) => {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useI18n();

  const form = useForm<z.infer<typeof updateUserSchema>>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: user,
  });

  const onSubmit = async (values: z.infer<typeof updateUserSchema>) => {
    try {
      const res = await updateUser({
        ...values,
        id: user.id,
      });

      if (!res.success) {
        return toast({
          variant: 'destructive',
          description: res.message,
        });
      }

      toast({
        description: res.message,
      });
      form.reset();
      router.push('/admin/users');
    } catch {
      toast({
        variant: 'destructive',
        description: t('ERROR_GENERIC'),
      });
    }
  };

  return (
    <Form {...form}>
      <form method='POST' onSubmit={form.handleSubmit(onSubmit)}>
        {/* Email */}
        <div>
          <FormField
            control={form.control}
            name='email'
            render={({
              field,
            }: {
              field: ControllerRenderProps<
                z.infer<typeof updateUserSchema>,
                'email'
              >;
            }) => (
              <FormItem className='w-full'>
                <FormLabel>{t('FIELD_EMAIL')}</FormLabel>
                <FormControl>
                  <Input disabled={true} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        {/* Name */}
        <div>
          <FormField
            control={form.control}
            name='name'
            render={({
              field,
            }: {
              field: ControllerRenderProps<
                z.infer<typeof updateUserSchema>,
                'name'
              >;
            }) => (
              <FormItem className='w-full'>
                <FormLabel>{t('FIELD_NAME')}</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        {/* Role */}
        <div>
          <FormField
            control={form.control}
            name='role'
            render={({
              field,
            }: {
              field: ControllerRenderProps<
                z.infer<typeof updateUserSchema>,
                'role'
              >;
            }) => (
              <FormItem className='w-full'>
                <FormLabel>{t('FIELD_ROLE')}</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value.toString()}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t('ADMIN_SELECT_ROLE')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role} value={role}>
                        {roleLabel(t, role)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className='flex-between mt-6'>
          <Button
            type='submit'
            className='w-full'
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? t('FORM_SAVING') : t('ADMIN_UPDATE_USER')}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default UpdateUserForm;
