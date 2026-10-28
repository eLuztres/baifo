import { Prisma, type SubmissionStatus } from '@prisma/client';
import { prisma } from '@/db/prisma';
import { APP_NAME } from '@/lib/constants';
import { HOUSE_SELLER, UNPAID_LISTING_HOURS } from './config';

/** The consent text the person agreed to; change the date whenever its wording changes. */
export const CONSENT_TEXT_VERSION = '2026-10-28';

export type ConsentSource = 'publish-page' | 'whatsapp-reply';

// Read off a phone and typed into Bizum: no 0/O, 1/I/L that people mix up.
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_PREFIX = APP_NAME.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 8) || 'PAGO';

/** A short Bizum concept like BAIFO-7Q2K; the database keeps it unique. */
export function newPayCode(random: () => number = Math.random) {
  const tail = Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(random() * CODE_CHARS.length)]).join('');
  return `${CODE_PREFIX}-${tail}`;
}

/** Baifo's own listings have no person behind them, so no number to show and no consent to ask. */
export const hasPersonNumber = (waId: string) => waId !== HOUSE_SELLER && /^\d+$/.test(waId);

/** A listing with the person's number goes online only with their recorded OK. */
export const lacksConsent = (listing: { consentAt: Date | null; seller: { waId: string } }) =>
  hasPersonNumber(listing.seller.waId) && !listing.consentAt;

const UNPAID_LISTING_MS = UNPAID_LISTING_HOURS * 60 * 60 * 1000;

/** The private link stops working this long after it was sent. */
export const unpaidCutoff = (now = new Date()) => new Date(now.getTime() - UNPAID_LISTING_MS);

export const isLinkExpired = (sentAt: Date | null, now = new Date()) => sentAt !== null && sentAt <= unpaidCutoff(now);

const isCodeTaken = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';

/**
 * The private link goes out (again): waiting for payment, timed from now, with its Bizum code.
 * Returns false when the listing can't be sent from its status.
 */
export async function markSent(id: string, from: SubmissionStatus[] = ['IN_REVIEW', 'AWAITING_PAYMENT']) {
  const current = await prisma.submission.findUnique({ where: { id }, select: { payCode: true } });
  for (let attempt = 0; ; attempt++) {
    try {
      const { count } = await prisma.submission.updateMany({
        where: { id, status: { in: from } },
        data: { status: 'AWAITING_PAYMENT', sentAt: new Date(), payCode: current?.payCode ?? newPayCode() },
      });
      return count > 0;
    } catch (error) {
      // Another listing has this code already: draw a new one.
      if (!isCodeTaken(error) || attempt >= 4) throw error;
    }
  }
}

/** Records the person's OK to show their number, the first time it is given. */
export const recordConsent = (where: Prisma.SubmissionWhereInput, source: ConsentSource) =>
  prisma.submission.updateMany({
    where: { ...where, consentAt: null },
    data: { hasContactConsent: true, consentAt: new Date(), consentSource: source, consentTextVersion: CONSENT_TEXT_VERSION },
  });
