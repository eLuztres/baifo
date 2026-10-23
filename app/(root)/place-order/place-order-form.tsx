'use client';

import { FormEvent, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Loader } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/components/i18n-provider';
import { toast } from '@/hooks/use-toast';
import { createOrder } from '@/lib/actions/order.actions';

type CreateOrderResult = Awaited<ReturnType<typeof createOrder>>;

const REQUEST_FAILED: CreateOrderResult = { success: false, message: 'ERROR_GENERIC' };

interface PlaceOrderButtonProps {
  isPending: boolean;
}

function PlaceOrderButton({ isPending }: PlaceOrderButtonProps) {
  const { t } = useI18n();

  return (
    <Button disabled={isPending} className='w-full'>
      {isPending ? <Loader className='w-4 h-4 animate-spin' /> : <Check className='w-4 h-4' />}{' '}
      {t('CHECKOUT_PLACE_ORDER')}
    </Button>
  );
}

const PlaceOrderForm = () => {
  const router = useRouter();
  // The transition stays pending until the next page has loaded, so a double tap can't order twice.
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isPending) return;

    startTransition(async () => {
      // A request that never reaches the server (offline, a new deploy) rejects; uncaught, the
      // transition would replace the checkout with the error page.
      const res = await createOrder().catch(() => REQUEST_FAILED);

      if (!res.success) toast({ variant: 'destructive', description: res.message });
      if (res.redirectTo) router.push(res.redirectTo);
    });
  };

  return (
    <form onSubmit={handleSubmit} className='w-full'>
      <PlaceOrderButton isPending={isPending} />
    </form>
  );
};

export default PlaceOrderForm;
