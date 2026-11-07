'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { z } from 'zod';
import { prisma } from '@/db/prisma';
import { CLOSE_LISTING_LIMIT, CLOSE_LISTING_LINK_LIMIT, LISTING_LINK_LIMIT, LISTING_PAGE_LIMIT } from '@/lib/constants';
import { isRateLimited, type RateLimit } from '@/lib/rate-limit';
import { clientIp } from '@/lib/sign-in-limit';
import { sellerLocaleSchema, sellerNameSchema, sellerPhoneSchema } from '@/lib/validators';
import { HOUSE_SELLER, LISTING_PAYMENT_METHODS } from './config';
import { isLinkExpired, recordConsent } from './listing-payment';
import { enableListing, publishConfirmed, takeDown } from './publish';
import { toWaId } from './seller';
import { moveListingToNumber } from './seller-number';

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
}

// Per IP and per link: the link alone mustn't allow endless seller numbers to be tried.
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

/** "Publicar mi anuncio": the person agrees to show their number and the listing goes online; no money is asked. */
export async function confirmListing(input: ListingChoice): Promise<ActionResult> {
  try {
    const submission = await saveChoice(input);
    if (!submission) return { success: false };
    await publishConfirmed(submission.id);
    return { success: true };
  } catch (error) {
    console.error('[listing] confirmation failed', error);
    return { success: false };
  }
}

const claimSchema = z.object({ token: z.string().uuid(), method: z.enum(['bizum', 'cash']) });

/** "Ya he hecho el Bizum" / "Os escribo para quedar" (to publish or renew): noted for the admin, who still checks the money and taps Pagado. */
export async function claimListingPayment(token: string, method: 'bizum' | 'cash'): Promise<ActionResult> {
  try {
    const parsed = claimSchema.safeParse({ token, method });
    if (!parsed.success || !LISTING_PAYMENT_METHODS.includes(parsed.data.method)) return { success: false };
    if (await isOverLimit(LISTING_PAGE_LIMIT, LISTING_LINK_LIMIT, parsed.data.token)) return { success: false };
    // The first payment, or a renewal of a listing paid before (online, or ended).
    const submission = await prisma.submission.findFirst({
      where: {
        payToken: parsed.data.token,
        OR: [
          { status: 'AWAITING_PAYMENT', consentAt: { not: null } },
          { status: { in: ['LIVE', 'EXPIRED'] }, paidAt: { not: null } },
        ],
      },
    });
    if (!submission || (submission.status === 'AWAITING_PAYMENT' && isLinkExpired(submission.sentAt))) return { success: false };
    await prisma.submission.update({ where: { id: submission.id }, data: { payClaimedAt: new Date(), payClaimedMethod: parsed.data.method } });
    return { success: true };
  } catch (error) {
    console.error('[listing] payment claim failed', error);
    return { success: false };
  }
}

const sellerSchema = z.object({ token: z.string().uuid(), name: sellerNameSchema, locale: sellerLocaleSchema });

/** The person's name or nickname on the listing and the language buyers write in; any time while the link works. */
export async function saveSellerName(token: string, name: string, locale: string): Promise<ActionResult & { isInvalidName?: boolean }> {
  try {
    const parsed = sellerSchema.safeParse({ token, name, locale });
    if (!parsed.success) return { success: false, isInvalidName: parsed.error.issues.some((issue) => issue.path[0] === 'name') };
    if (await isOverLimit(LISTING_PAGE_LIMIT, LISTING_LINK_LIMIT, parsed.data.token)) return { success: false };
    const submission = await prisma.submission.findFirst({
      where: { payToken: parsed.data.token, status: { in: ['AWAITING_PAYMENT', 'LIVE'] } },
      select: { id: true, status: true, sentAt: true, product: { select: { slug: true } } },
    });
    if (!submission || (submission.status !== 'LIVE' && isLinkExpired(submission.sentAt))) return { success: false };
    await prisma.submission.update({ where: { id: submission.id }, data: { sellerName: parsed.data.name, sellerLocale: parsed.data.locale } });
    if (submission.product) revalidatePath(`/product/${submission.product.slug}`);
    return { success: true };
  } catch (error) {
    console.error('[listing] seller name failed', error);
    return { success: false };
  }
}

// The last nine digits are the Spanish number, so "612 345 678", "+34 612…" and "0034 612…" all match.
const isSamePhone = (typed: string, waId: string) => {
  const digits = typed.replace(/\D/g, '');
  return digits.length >= 9 && digits.slice(-9) === waId.slice(-9);
};

const manageSchema = z.object({ token: z.string().uuid(), action: z.enum(['sold', 'hide', 'show', 'delete']) });

export type ListingAction = z.infer<typeof manageSchema>['action'];

/**
 * The person's own buttons on their private page: sold (a product; an event is cancelled), hide, show again or delete.
 * The private link is theirs alone, as it is for publishing, so nothing else is asked.
 */
export async function manageListing(token: string, action: ListingAction): Promise<ActionResult & { isTooMany?: boolean }> {
  try {
    const parsed = manageSchema.safeParse({ token, action });
    if (!parsed.success) return { success: false };
    if (await isOverLimit(CLOSE_LISTING_LIMIT, CLOSE_LISTING_LINK_LIMIT, parsed.data.token)) return { success: false, isTooMany: true };
    const submission = await prisma.submission.findFirst({
      where: { payToken: parsed.data.token, status: { in: ['LIVE', 'HIDDEN'] } },
      select: { id: true, type: true, status: true, productId: true },
    });
    if (!submission) return { success: false };
    const isLive = submission.status === 'LIVE';
    switch (parsed.data.action) {
      case 'sold':
        if (!isLive || (submission.type !== 'PRODUCT' && submission.type !== 'EVENT')) return { success: false };
        await takeDown(submission.id, submission.type === 'EVENT' ? 'CANCELLED' : 'SOLD');
        break;
      case 'hide':
        if (!isLive) return { success: false };
        await takeDown(submission.id, 'HIDDEN');
        break;
      case 'show':
        if (isLive || !(await enableListing(submission.id))) return { success: false };
        break;
      case 'delete':
        await prisma.$transaction([
          ...(submission.productId ? [prisma.product.delete({ where: { id: submission.productId } })] : []),
          prisma.submission.delete({ where: { id: submission.id } }),
        ]);
        revalidatePath('/');
        break;
    }
    return { success: true };
  } catch (error) {
    console.error('[listing] managing failed', error);
    return { success: false };
  }
}

const phoneChangeSchema = z.object({
  token: z.string().uuid(),
  currentPhone: z.string().max(30),
  newPhone: sellerPhoneSchema.refine((digits) => digits !== ''),
});

/**
 * "Cambiar número": buyers write to the new number and it closes the listing from now on. The old number is
 * asked too, so a forwarded link alone can't take the listing over.
 */
export async function changeSellerPhone(
  token: string,
  currentPhone: string,
  newPhone: string,
): Promise<ActionResult & { phoneEnd?: string; isWrongPhone?: boolean; isInvalidPhone?: boolean; isTooMany?: boolean }> {
  try {
    const parsed = phoneChangeSchema.safeParse({ token, currentPhone, newPhone });
    if (!parsed.success) return { success: false, isInvalidPhone: parsed.error.issues.some((issue) => issue.path[0] === 'newPhone') };
    // The same limits as closing: both let someone guess the number.
    if (await isOverLimit(CLOSE_LISTING_LIMIT, CLOSE_LISTING_LINK_LIMIT, parsed.data.token)) return { success: false, isTooMany: true };
    const submission = await prisma.submission.findFirst({
      where: { payToken: parsed.data.token, status: { in: ['AWAITING_PAYMENT', 'LIVE'] } },
      select: { id: true, status: true, sentAt: true, hasContactConsent: true, productId: true, product: { select: { slug: true } }, seller: { select: { waId: true, name: true } } },
    });
    if (!submission || submission.seller.waId === HOUSE_SELLER || (submission.status !== 'LIVE' && isLinkExpired(submission.sentAt))) return { success: false };
    if (!isSamePhone(parsed.data.currentPhone, submission.seller.waId)) return { success: false, isWrongPhone: true };
    const waId = toWaId(parsed.data.newPhone);
    await moveListingToNumber(submission, waId);
    if (submission.product) revalidatePath(`/product/${submission.product.slug}`);
    return { success: true, phoneEnd: waId.slice(-3) };
  } catch (error) {
    console.error('[listing] number change failed', error);
    return { success: false };
  }
}
