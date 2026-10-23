import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { OutOfStockError, updateOrderToPaid } from '@/lib/order-payment';
import { round2 } from '@/lib/utils';
import { idSchema } from '@/lib/validators';

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[stripe] STRIPE_WEBHOOK_SECRET is not set');
    return NextResponse.json({ message: 'webhook is not configured' }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    event = Stripe.webhooks.constructEvent(await req.text(), req.headers.get('stripe-signature') ?? '', secret);
  } catch {
    return NextResponse.json({ message: 'invalid signature' }, { status: 400 });
  }

  if (event.type !== 'charge.succeeded') {
    return NextResponse.json({ message: 'event is not charge.succeeded' });
  }

  const charge = event.data.object;
  // Charges without our order id (payment links, dashboard charges, `stripe trigger`) aren't orders.
  const orderId = idSchema.safeParse(charge.metadata?.orderId);
  if (!orderId.success) {
    return NextResponse.json({ message: 'ignored: no order id' });
  }

  try {
    const outcome = await updateOrderToPaid({
      orderId: orderId.data,
      paymentResult: {
        id: charge.id,
        status: 'COMPLETED',
        email_address: charge.billing_details.email ?? '',
        pricePaid: round2(charge.amount / 100).toFixed(2),
      },
    });
    // A repeated delivery carries the same charge; a different one means the buyer paid twice.
    if (outcome.status === 'already-paid' && outcome.paymentId !== charge.id) {
      console.error(
        `[stripe] Order ${orderId.data} was already paid (${outcome.paymentId}); charge ${charge.id} needs a refund`
      );
    }
    return NextResponse.json({ message: outcome.status });
  } catch (error) {
    if (error instanceof OutOfStockError) {
      // A retry can't help: the ring went to someone else, so this charge needs a refund.
      console.error(`[stripe] Order ${orderId.data} was paid by ${charge.id}, but ${error.productName} is sold out`);
      return NextResponse.json({ message: 'out of stock' });
    }
    // Another shop or environment on the same Stripe account, or a deleted order: a retry can't help,
    // and endless 500s would get the endpoint disabled for real orders too.
    if (error instanceof Error && error.message === 'ERROR_NOT_FOUND') {
      console.error(`[stripe] Charge ${charge.id} names unknown order ${orderId.data}`);
      return NextResponse.json({ message: 'ignored: unknown order' });
    }
    // 500 makes Stripe retry, which covers a database hiccup.
    console.error(`[stripe] Order ${orderId.data} could not be marked as paid`, error);
    return NextResponse.json({ message: 'order could not be marked as paid' }, { status: 500 });
  }
}
