'use client';

import { PayPalButtons, PayPalScriptProvider, usePayPalScriptReducer } from '@paypal/react-paypal-js';
import { useI18n } from '@/components/i18n-provider';
import { toast } from '@/hooks/use-toast';
import { approvePayPalOrder, createPayPalOrder } from '@/lib/actions/order.actions';
import { CURRENCY } from '@/lib/constants/currency';

interface PayPalCheckoutProps {
  orderId: string;
  clientId: string;
}

function PayPalLoadingState() {
  const { t } = useI18n();
  const [{ isPending, isRejected }] = usePayPalScriptReducer();

  if (isPending) return <p className='text-sm text-muted-foreground'>{t('ORDER_PAYPAL_LOADING')}</p>;
  if (isRejected) return <p className='text-sm text-destructive'>{t('ORDER_PAYPAL_LOAD_ERROR')}</p>;
  return null;
}

export default function PayPalCheckout({ orderId, clientId }: PayPalCheckoutProps) {
  const handleCreateOrder = async () => {
    const res = await createPayPalOrder(orderId);
    if (!res.success || !res.data) {
      toast({ variant: 'destructive', description: res.message });
      // Throwing closes the PayPal window instead of leaving it waiting for an order id.
      throw new Error(res.message);
    }
    return res.data;
  };

  const handleApprove = async ({ orderID }: { orderID: string }) => {
    const res = await approvePayPalOrder(orderId, { orderID });
    toast({ variant: res.success ? 'default' : 'destructive', description: res.message });
  };

  return (
    <PayPalScriptProvider options={{ clientId, currency: CURRENCY }}>
      <PayPalLoadingState />
      <PayPalButtons createOrder={handleCreateOrder} onApprove={handleApprove} />
    </PayPalScriptProvider>
  );
}
