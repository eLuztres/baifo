import Stripe from 'stripe';
import { CURRENCY } from '@/lib/constants/currency';
import { getT } from '@/lib/i18n-server';
import { findItemOutOfStock } from '@/lib/order-payment';
import { Order } from '@/types';
import { PayPalCheckout, StripeCheckout } from './lazy-checkouts';

export const ONLINE_PAYMENT_METHODS = ['PayPal', 'Stripe'];

interface OrderPaymentProps {
  order: Order;
}

async function createStripeClientSecret(order: Order) {
  try {
    // Created per request: at module level it breaks the build of shops without Stripe.
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
    // One intent per order: within 24 h Stripe returns the same one instead of a new one per page view.
    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: Math.round(Number(order.totalPrice) * 100),
        currency: CURRENCY,
        metadata: { orderId: order.id },
      },
      { idempotencyKey: `order-${order.id}` }
    );
    return paymentIntent.client_secret;
  } catch (error) {
    console.error(`[stripe] No payment intent for order ${order.id}`, error);
    return null;
  }
}

/** How the buyer pays an unpaid PayPal or Stripe order, unless a ring sold out in the meantime. */
export default async function OrderPaymentSection({ order }: OrderPaymentProps) {
  const [soldOutItem, { t }] = await Promise.all([findItemOutOfStock(order.orderitems), getT()]);
  if (soldOutItem) {
    return <p className='text-sm text-destructive'>{t('ORDER_SOLD_OUT', { name: soldOutItem.name })}</p>;
  }

  if (order.paymentMethod === 'PayPal') {
    return <PayPalCheckout orderId={order.id} clientId={process.env.PAYPAL_CLIENT_ID || 'sb'} />;
  }

  const clientSecret = await createStripeClientSecret(order);
  if (!clientSecret) return <p className='text-sm text-destructive'>{t('ERROR_GENERIC')}</p>;

  return <StripeCheckout orderId={order.id} clientSecret={clientSecret} totalPrice={order.totalPrice} />;
}
