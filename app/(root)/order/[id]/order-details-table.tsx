import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import OrderInfoCard from '@/components/shared/order/order-info-card';
import OrderItemsTable from '@/components/shared/order/order-items-table';
import OrderSummary from '@/components/shared/order/order-summary';
import ShippingAddressDetails from '@/components/shared/order/shipping-address-details';
import { getT } from '@/lib/i18n-server';
import { formatDateTime, formatId, paymentMethodLabel } from '@/lib/utils';
import { Order } from '@/types';

interface OrderDetailsTableProps {
  order: Order;
  /** Shown under the totals: the payment form for the buyer, the order actions for admins. */
  children?: ReactNode;
}

const OrderDetailsTable = async ({ order, children }: OrderDetailsTableProps) => {
  const { t, locale } = await getT();
  const { id, shippingAddress, orderitems, paymentMethod, isDelivered, isPaid, paidAt, deliveredAt } = order;

  return (
    <>
      <h1 className='py-4 text-2xl'>{t('ORDER_TITLE', { id: formatId(id) })}</h1>
      <div className='grid gap-4 md:grid-cols-3 md:gap-5'>
        <div className='md:col-span-2 space-y-4 overflow-x-auto'>
          <OrderInfoCard title={t('CHECKOUT_PAYMENT_METHOD')}>
            <p className='mb-2'>{paymentMethodLabel(t, paymentMethod)}</p>
            {isPaid && paidAt ? (
              <Badge variant='secondary'>
                {t('ORDER_PAID_AT', { date: formatDateTime(paidAt, locale).dateTime })}
              </Badge>
            ) : (
              <Badge variant='destructive'>{t('ORDER_NOT_PAID')}</Badge>
            )}
          </OrderInfoCard>
          <OrderInfoCard title={t('CHECKOUT_SHIPPING_ADDRESS')}>
            <ShippingAddressDetails address={shippingAddress} />
            {isDelivered && deliveredAt ? (
              <Badge variant='secondary'>
                {t('ORDER_DELIVERED_AT', { date: formatDateTime(deliveredAt, locale).dateTime })}
              </Badge>
            ) : (
              <Badge variant='destructive'>{t('ORDER_NOT_DELIVERED')}</Badge>
            )}
          </OrderInfoCard>
          <OrderItemsTable items={orderitems} />
        </div>
        <OrderSummary prices={order}>{children}</OrderSummary>
      </div>
    </>
  );
};

export default OrderDetailsTable;
