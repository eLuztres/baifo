'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { SubmitHandler, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowRight, Loader } from 'lucide-react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/components/i18n-provider';
import { toast } from '@/hooks/use-toast';
import { updateUserAddress } from '@/lib/actions/user.actions';
import type { TranslationKey } from '@/lib/i18n-core';
import { shippingAddressSchema } from '@/lib/validators';
import { ShippingAddress } from '@/types';

type ShippingAddressValues = z.infer<typeof shippingAddressSchema>;

interface AddressField {
  name: Exclude<keyof ShippingAddressValues, 'lat' | 'lng'>;
  label: TranslationKey;
  placeholder: TranslationKey;
  // Lets phones (iOS Safari) fill the address in one tap.
  autoComplete: string;
}

const ADDRESS_FIELDS: AddressField[] = [
  { name: 'fullName', label: 'CHECKOUT_FULL_NAME', placeholder: 'CHECKOUT_FULL_NAME_PLACEHOLDER', autoComplete: 'name' },
  {
    name: 'streetAddress',
    label: 'CHECKOUT_STREET',
    placeholder: 'CHECKOUT_STREET_PLACEHOLDER',
    autoComplete: 'street-address',
  },
  { name: 'city', label: 'CHECKOUT_CITY', placeholder: 'CHECKOUT_CITY_PLACEHOLDER', autoComplete: 'address-level2' },
  {
    name: 'postalCode',
    label: 'CHECKOUT_POSTAL_CODE',
    placeholder: 'CHECKOUT_POSTAL_CODE_PLACEHOLDER',
    autoComplete: 'postal-code',
  },
  { name: 'country', label: 'CHECKOUT_COUNTRY', placeholder: 'CHECKOUT_COUNTRY_PLACEHOLDER', autoComplete: 'country-name' },
];

interface ShippingAddressFormProps {
  address: ShippingAddress;
}

const ShippingAddressForm = ({ address }: ShippingAddressFormProps) => {
  const router = useRouter();
  const { t } = useI18n();

  const form = useForm<ShippingAddressValues>({
    resolver: zodResolver(shippingAddressSchema),
    defaultValues: address,
  });

  const [isPending, startTransition] = useTransition();

  const onSubmit: SubmitHandler<ShippingAddressValues> = async (values) => {
    startTransition(async () => {
      const res = await updateUserAddress(values);

      if (!res.success) {
        toast({
          variant: 'destructive',
          description: res.message,
        });
        return;
      }

      router.push('/payment-method');
    });
  };

  return (
    <div className='max-w-md mx-auto space-y-4'>
      <h1 className='h2-bold mt-4'>{t('CHECKOUT_SHIPPING_ADDRESS')}</h1>
      <p className='text-sm text-muted-foreground'>{t('CHECKOUT_SHIPPING_TEXT')}</p>
      <Form {...form}>
        <form method='post' className='space-y-4' onSubmit={form.handleSubmit(onSubmit)}>
          {ADDRESS_FIELDS.map(({ name, label, placeholder, autoComplete }) => (
            <div key={name} className='flex flex-col md:flex-row gap-5'>
              <FormField
                control={form.control}
                name={name}
                render={({ field }) => (
                  <FormItem className='w-full'>
                    <FormLabel>{t(label)}</FormLabel>
                    <FormControl>
                      <Input placeholder={t(placeholder)} autoComplete={autoComplete} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          ))}
          <div className='flex gap-2'>
            <Button type='submit' disabled={isPending}>
              {isPending ? <Loader className='w-4 h-4 animate-spin' /> : <ArrowRight className='w-4 h-4' />}{' '}
              {t('CHECKOUT_CONTINUE')}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default ShippingAddressForm;
