'use server';

import { headers } from 'next/headers';
import Stripe from 'stripe';
import { z } from 'zod';
import { prisma } from '@/db/prisma';
import { CLOSE_LISTING_LIMIT, CLOSE_LISTING_LINK_LIMIT, LISTING_LINK_LIMIT, LISTING_PAGE_LIMIT } from '@/lib/constants';
import { CURRENCY } from '@/lib/constants/currency';
import { paypal } from '@/lib/paypal';
import { isRateLimited, type RateLimit } from '@/lib/rate-limit';
import { clientIp } from '@/lib/sign-in-limit';
import { LISTING_PAYMENT_METHODS, LISTING_PRICES, publishUrl, type ListingPlan } from './config';
import { isLinkExpired, recordConsent } from './listing-payment';
import { publishSubmission, takeDown } from './publish';

// The seller's choices on /publicar; the token is the only thing that identifies them.
// Premium and the extras are shown as "coming soon" only, so a request with them is refused.
const choiceSchema = z
  .object({
    token: z.string().uuid(),
    plan: z.literal('normal'),
    hasContactConsent: z.literal(true),
  })
  .strict();

export type ListingChoice = z.infer<typeof choiceSchema>;

interface ActionResult {
  success: boolean;
  url?: string;
  orderId?: string;
}

// Per IP and per link: the link alone mustn't allow endless Stripe/PayPal sessions or seller numbers to be tried.
async function isOverLimit(ipLimit: RateLimit, linkLimit: RateLimit, token: string) {
  return (await isRateLimited(ipLimit, clientIp(await headers()))) || (await isRateLimited(linkLimit, token));
}

/** Saves the plan, extras and the person's OK of an approved listing and returns it, or null for an invalid or expired link. */
async function saveChoice(input: unknown) {
  const choice = choiceSchema.safeParse(input);
  if (!choice.success) return null;
  const { token, ...data } = choice.data;
  if (await isOverLimit(LISTING_PAGE_LIMIT, LISTING_LINK_LIMIT, token)) return null;
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

const claimSchema = z.object({ token: z.string().uuid(), method: z.enum(['bizum', 'cash']) });

/** "Ya he hecho el Bizum" / "Pasaré por El Corral": noted for the admin, who still checks the money and taps Pagado. */
export async function claimListingPayment(token: string, method: 'bizum' | 'cash'): Promise<ActionResult> {
  try {
    const parsed = claimSchema.safeParse({ token, method });
    if (!parsed.success || !LISTING_PAYMENT_METHODS.includes(parsed.data.method)) return { success: false };
    if (await isOverLimit(LISTING_PAGE_LIMIT, LISTING_LINK_LIMIT, parsed.data.token)) return { success: false };
    const submission = await prisma.submission.findFirst({ where: { payToken: parsed.data.token, status: 'AWAITING_PAYMENT', consentAt: { not: null } } });
    if (!submission || isLinkExpired(submission.sentAt)) return { success: false };
    await prisma.submission.update({ where: { id: submission.id }, data: { payClaimedAt: new Date(), payClaimedMethod: parsed.data.method } });
    return { success: true };
  } catch (error) {
    console.error('[listing] payment claim failed', error);
    return { success: false };
  }
}

const closeSchema = z.object({ token: z.string().uuid(), phone: z.string().max(30) });

// The last nine digits are the Spanish number, so "612 345 678", "+34 612…" and "0034 612…" all match.
const isSamePhone = (typed: string, waId: string) => {
  const digits = typed.replace(/\D/g, '');
  return digits.length >= 9 && digits.slice(-9) === waId.slice(-9);
};

/**
 * "Marcar como vendido" / "Cancelar el evento": a live product or event leaves the shop. The person types their
 * WhatsApp number as well, so a forwarded link alone can't take the listing down.
 */
export async function closeListing(token: string, phone: string): Promise<ActionResult & { isWrongPhone?: boolean; isTooMany?: boolean }> {
  try {
    const parsed = closeSchema.safeParse({ token, phone });
    if (!parsed.success) return { success: false };
    if (await isOverLimit(CLOSE_LISTING_LIMIT, CLOSE_LISTING_LINK_LIMIT, parsed.data.token)) return { success: false, isTooMany: true };
    const submission = await prisma.submission.findFirst({
      where: { payToken: parsed.data.token, status: 'LIVE', type: { in: ['PRODUCT', 'EVENT'] } },
      select: { id: true, type: true, seller: { select: { waId: true } } },
    });
    if (!submission) return { success: false };
    if (!isSamePhone(parsed.data.phone, submission.seller.waId)) return { success: false, isWrongPhone: true };
    await takeDown(submission.id, submission.type === 'EVENT' ? 'CANCELLED' : 'SOLD');
    return { success: true };
  } catch (error) {
    console.error('[listing] closing failed', error);
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
    if (await isOverLimit(LISTING_PAGE_LIMIT, LISTING_LINK_LIMIT, parsed.data.token)) return { success: false };
    // Only while it waits for the fee: the money of a listing that is already paid or expired isn't taken.
    const submission = await prisma.submission.findFirst({ where: { payToken: parsed.data.token, status: 'AWAITING_PAYMENT' } });
    if (!submission || isLinkExpired(submission.sentAt)) return { success: false };

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
