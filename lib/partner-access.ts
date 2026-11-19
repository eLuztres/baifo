import { randomBytes } from 'node:crypto';
import { cache } from 'react';
import { cookies } from 'next/headers';
import type { SubmissionStatus } from '@prisma/client';
import { prisma } from '@/db/prisma';
import { isAdmin } from '@/lib/auth-guard';

// The partner's panel link sets it; it holds the link's secret, so a new link signs the old browsers out too.
export const PARTNER_COOKIE = 'baifo_mercadillo';
export const PARTNER_COOKIE_DAYS = 365;

// Listings that take one of a mercadillo's places: online, hidden or on their way. Sold, ended and drafts don't.
export const PARTNER_ACTIVE_STATUSES: SubmissionStatus[] = ['PROCESSING', 'IN_REVIEW', 'AWAITING_PAYMENT', 'LIVE', 'HIDDEN'];

/** The secret part of a panel link: long and random, so it can't be guessed. */
export const newPartnerToken = () => randomBytes(24).toString('base64url');

/** The partner whose panel link this browser opened, if the link still works. */
export const getSignedInPartner = cache(async () => {
  const token = (await cookies()).get(PARTNER_COOKIE)?.value;
  if (!token) return null;
  return prisma.partner.findUnique({ where: { token } });
});

/** The admin, or a partner in its panel: both use the listing editor's uploads, voice input and etiquetas. */
export async function isAdminOrPartner() {
  return (await isAdmin()) || Boolean(await getSignedInPartner());
}

/** Who may change this listing: the admin always, a partner only its own mercadillo's. */
export async function listingEditor(id: string): Promise<'admin' | 'partner' | null> {
  if (await isAdmin()) return 'admin';
  const partner = await getSignedInPartner();
  if (!partner) return null;
  const listing = await prisma.submission.findUnique({ where: { id }, select: { partnerId: true } });
  return listing?.partnerId === partner.id ? 'partner' : null;
}

/** How many of its places a mercadillo uses; `exceptId` leaves out the listing being checked. */
export const countPartnerListings = (partnerId: string, exceptId?: string) =>
  prisma.submission.count({ where: { partnerId, status: { in: PARTNER_ACTIVE_STATUSES }, ...(exceptId && { id: { not: exceptId } }) } });

/** Whether one more listing fits in the mercadillo. */
export async function hasPartnerRoom(partner: { id: string; maxListings: number }, exceptId?: string) {
  return (await countPartnerListings(partner.id, exceptId)) < partner.maxListings;
}
