import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getOrderById } from '@/lib/actions/order.actions';
import { requireUser } from '@/lib/auth-guard';
import { getT } from '@/lib/i18n-server';
import OrderDetailsTable from './order-details-table';
import OrderPaymentSection, { ONLINE_PAYMENT_METHODS } from './order-payment-section';
import { MarkAsDeliveredButton, MarkAsPaidButton } from './admin-order-actions';
import { PaymentSkeleton } from './lazy-checkouts';

export async function generateMetadata() {
  const { t } = await getT();
  return { title: t('ORDER_DETAILS') };
}

interface OrderDetailsPageProps {
  params: Promise<{ id: string }>;
}

const OrderDetailsPage = async ({ params }: OrderDetailsPageProps) => {
  const { id } = await params;
  const [session, order] = await Promise.all([requireUser(), getOrderById(id)]);
  // Also for orders of other customers, so the page doesn't reveal that they exist.
  if (!order) notFound();

  const isAdmin = session.user.role === 'admin';
  const canPayOnline =
    order.userId === session.user.id && !order.isPaid && ONLINE_PAYMENT_METHODS.includes(order.paymentMethod);

  return (
    <OrderDetailsTable order={order}>
      {canPayOnline && (
        <Suspense fallback={<PaymentSkeleton />}>
          <OrderPaymentSection order={order} />
        </Suspense>
      )}
      {isAdmin && !order.isPaid && order.paymentMethod === 'CashOnDelivery' && (
        <MarkAsPaidButton orderId={order.id} />
      )}
      {isAdmin && order.isPaid && !order.isDelivered && <MarkAsDeliveredButton orderId={order.id} />}
    </OrderDetailsTable>
  );
};

export default OrderDetailsPage;
