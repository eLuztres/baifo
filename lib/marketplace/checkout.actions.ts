'use server';

import Stripe from 'stripe';
import { z } from 'zod';
import { prisma } from '@/db/prisma';
import { CURRENCY } from '@/lib/constants/currency';
import { paypal } from '@/lib/paypal';
import { LISTING_PRICES, publishUrl, type ListingPlan } from './config';
import { isLinkExpired, recordConsent } from './listing-payment';
import { publishSubmission } from './publish';

// The seller's choices on /publicar; the token is the only thing that identifies them.
const choiceSchema = z.object({
  token: z.string().uuid(),
  plan: z.enum(['normal', 'big']),
  crossPostFacebook: z.boolean(),
  crossPostWallapop: z.boolean(),
  hasContactConsent: z.literal(true),
});

export type ListingChoice = z.infer<typeof choiceSchema>;

interface ActionResult {
  success: boolean;
  url?: string;
  orderId?: string;
}

/** Saves the plan, extras and the person's OK of an approved listing and returns it, or null for an invalid or expired link. */
async function saveChoice(input: unknown) {
  const choice = choiceSchema.safeParse(input);
  if (!choice.success) return null;
  const { token, ...data } = choice.data;
  const submission = await prisma.submission.findFirst({ where: { payToken: token, status: 'AWAITING_PAYMENT' } });
  if (!submission || isLinkExpired(submission.sentAt)) return null;
  await recordConsent({ id: submission.id }, 'publish-page');
  return prisma.submission.update({ where: { id: submission.id }, data });
}

/** "Confirmar": the person agrees to show their number and picks a plan; the page then shows how to pay. */
export async function confirmListing(input: ListingChoice): Promise<ActionResult> {
  try {
    return { success: Boolean(await saveChoice(input)) };
  } catch (error) {
    console.error('[listing] confirmation failed', error);
    return { success: false };
  }
}

/** Stripe's hosted checkout for the listing fee; the stripe-listing webhook publishes after payment. */
export async function startStripeCheckout(input: ListingChoice): Promise<ActionResult> {
  try {
    const submission = await saveChoice(input);
    if (!submission) return { success: false };
    const price = LISTING_PRICES[submission.plan as ListingPlan];
    const session = await new Stripe(process.env.STRIPE_SECRET_KEY as string).checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: CURRENCY.toLowerCase(),
            unit_amount: Math.round(Number(price) * 100),
            product_data: { name: `Baifo · ${submission.title ?? 'Anuncio'} (${submission.plan === 'big' ? 'Grande' : 'Normal'})` },
          },
        },
      ],
      metadata: { submissionId: submission.id },
      payment_intent_data: { metadata: { submissionId: submission.id } },
      success_url: `${publishUrl(submission.payToken)}?pagado=1`,
      cancel_url: publishUrl(submission.payToken),
    });
    return session.url ? { success: true, url: session.url } : { success: false };
  } catch (error) {
    console.error('[listing] Stripe checkout failed', error);
    return { success: false };
  }
}

export async function createListingPayPalOrder(input: ListingChoice): Promise<ActionResult> {
  try {
    const submission = await saveChoice(input);
    if (!submission) return { success: false };
    const order = await paypal.createOrder(LISTING_PRICES[submission.plan as ListingPlan]);
    return { success: true, orderId: order.id };
  } catch (error) {
    console.error('[listing] PayPal order failed', error);
    return { success: false };
  }
}

export async function captureListingPayPalOrder(token: string, orderId: string): Promise<ActionResult> {
  try {
    const parsed = z.object({ token: z.string().uuid(), orderId: z.string().min(1) }).safeParse({ token, orderId });
    if (!parsed.success) return { success: false };
    const submission = await prisma.submission.findFirst({ where: { payToken: parsed.data.token } });
    if (!submission) return { success: false };

    const capture = await paypal.capturePayment(parsed.data.orderId);
    const amount = capture.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value;
    if (capture.status !== 'COMPLETED' || !amount) return { success: false };

    const outcome = await publishSubmission({
      submissionId: submission.id,
      provider: 'PayPal',
      paymentId: capture.id,
      amountPaid: Number(amount).toFixed(2),
    });
    if (outcome === 'wrong-amount') console.error(`[listing] PayPal ${capture.id} paid ${amount} for ${submission.id}: refund needed`);
    return { success: outcome === 'published' || outcome === 'already-published' };
  } catch (error) {
    console.error('[listing] PayPal capture failed', error);
    return { success: false };
  }
}
