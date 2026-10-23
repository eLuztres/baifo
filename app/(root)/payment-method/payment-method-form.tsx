'use client';
import { useRouter } from 'next/navigation';
import { toast } from '@/hooks/use-toast';
import { useTransition } from 'react';
import { paymentMethodSchema } from '@/lib/validators';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { ArrowRight, Loader } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { updateUserPaymentMethod } from '@/lib/actions/user.actions';
import { useI18n } from '@/components/i18n-provider';
import { paymentMethodLabel } from '@/lib/utils';

interface PaymentMethodFormProps {
  preferredPaymentMethod: string | null;
  // Passed from the server page because PAYMENT_METHODS isn't readable in the browser.
  paymentMethods: string[];
  defaultPaymentMethod: string;
}

const PaymentMethodForm = ({
  preferredPaymentMethod,
  paymentMethods,
  defaultPaymentMethod,
}: PaymentMethodFormProps) => {
  const router = useRouter();
  const { t } = useI18n();

  const form = useForm<z.infer<typeof paymentMethodSchema>>({
    resolver: zodResolver(paymentMethodSchema),
    defaultValues: {
      type: preferredPaymentMethod || defaultPaymentMethod,
    },
  });

  const [isPending, startTransition] = useTransition();

  const onSubmit = async (values: z.infer<typeof paymentMethodSchema>) => {
    startTransition(async () => {
      const res = await updateUserPaymentMethod(values);

      if (!res.success) {
        toast({
          variant: 'destructive',
          description: res.message,
        });
        return;
      }

      router.push('/place-order');
    });
  };

  return (
    <>
      <div className='max-w-md mx-auto space-y-4'>
        <h1 className='h2-bold mt-4'>{t('CHECKOUT_PAYMENT_METHOD')}</h1>
        <p className='text-sm text-muted-foreground'>{t('CHECKOUT_PAYMENT_TEXT')}</p>
        <Form {...form}>
          <form
            method='post'
            className='space-y-4'
            onSubmit={form.handleSubmit(onSubmit)}
          >
            <div className='flex flex-col md:flex-row gap-5'>
              <FormField
                control={form.control}
                name='type'
                render={({ field }) => (
                  <FormItem className='space-y-3'>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        className='flex flex-col space-y-2'
                      >
                        {paymentMethods.map((paymentMethod) => (
                          <FormItem
                            key={paymentMethod}
                            className='flex items-center space-x-3 space-y-0'
                          >
                            <FormControl>
                              <RadioGroupItem
                                value={paymentMethod}
                                checked={field.value === paymentMethod}
                              />
                            </FormControl>
                            <FormLabel className='font-normal'>
                              {paymentMethodLabel(t, paymentMethod)}
                            </FormLabel>
                          </FormItem>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className='flex gap-2'>
              <Button type='submit' disabled={isPending}>
                {isPending ? (
                  <Loader className='w-4 h-4 animate-spin' />
                ) : (
                  <ArrowRight className='w-4 h-4' />
                )}{' '}
                {t('CHECKOUT_CONTINUE')}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </>
  );
};

export default PaymentMethodForm;
