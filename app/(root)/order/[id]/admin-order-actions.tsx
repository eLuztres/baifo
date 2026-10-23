'use client';

import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/components/i18n-provider';
import { toast } from '@/hooks/use-toast';
import { deliverOrder, updateOrderToPaidCOD } from '@/lib/actions/order.actions';
import type { TranslationKey } from '@/lib/i18n-core';

interface OrderActionResult {
  success: boolean;
  message: string;
}

interface OrderActionButtonProps {
  label: TranslationKey;
  action: () => Promise<OrderActionResult>;
}

function OrderActionButton({ label, action }: OrderActionButtonProps) {
  const { t } = useI18n();
  const [isPending, startTransition] = useTransition();

  const handleClick = () =>
    startTransition(async () => {
      const res = await action();
      toast({ variant: res.success ? 'default' : 'destructive', description: res.message });
    });

  return (
    <Button type='button' disabled={isPending} onClick={handleClick}>
      {isPending ? t('ORDER_PROCESSING') : t(label)}
    </Button>
  );
}

interface OrderActionProps {
  orderId: string;
}

/** For cash-on-delivery orders, once the money has been collected. */
export function MarkAsPaidButton({ orderId }: OrderActionProps) {
  return <OrderActionButton label='ORDER_MARK_PAID' action={() => updateOrderToPaidCOD(orderId)} />;
}

export function MarkAsDeliveredButton({ orderId }: OrderActionProps) {
  return <OrderActionButton label='ORDER_MARK_DELIVERED' action={() => deliverOrder(orderId)} />;
}
