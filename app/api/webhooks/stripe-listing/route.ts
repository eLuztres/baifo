import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { publishSubmission } from '@/lib/marketplace/publish';

// Its own Stripe endpoint (and secret), so the template's order webhook stays untouched.
export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_LISTING_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[stripe-listing] STRIPE_LISTING_WEBHOOK_SECRET is not set');
    return NextResponse.json({ message: 'webhook is not configured' }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    event = Stripe.webhooks.constructEvent(await req.text(), req.headers.get('stripe-signature') ?? '', secret);
  } catch {
    return NextResponse.json({ message: 'invalid signature' }, { status: 400 });
  }

  if (event.type !== 'checkout.session.completed') return NextResponse.json({ message: 'ignored' });
  const session = event.data.object;
  const submissionId = session.metadata?.submissionId;
  if (!submissionId || session.payment_status !== 'paid') return NextResponse.json({ message: 'ignored: not a paid listing' });

  try {
    const outcome = await publishSubmission({
      submissionId,
      provider: 'Stripe',
      paymentId: String(session.payment_intent ?? session.id),
      amountPaid: ((session.amount_total ?? 0) / 100).toFixed(2),
    });
    if (outcome === 'wrong-amount') console.error(`[stripe-listing] ${session.id} paid the wrong amount for ${submissionId}: refund needed`);
    return NextResponse.json({ message: outcome });
  } catch (error) {
    // 500 makes Stripe retry, which covers a database hiccup.
    console.error(`[stripe-listing] ${submissionId} could not be published`, error);
    return NextResponse.json({ message: 'could not publish' }, { status: 500 });
  }
}
