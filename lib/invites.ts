import { randomBytes } from 'crypto';
import { prisma } from '@/db/prisma';
import { SERVER_URL, SIGN_UP_BY_INVITE } from '@/lib/constants';

/** Holds the invite between opening the link and creating the account (email or Google). */
export const INVITE_COOKIE = 'invite_token';
export const INVITE_DAYS = 14;

export const inviteUrl = (token: string) => `${SERVER_URL}/invite/${token}`;

export const newInviteToken = () => randomBytes(18).toString('base64url');

/** The invite behind a link, while it is unused and not expired. */
export async function findOpenInvite(token: string | undefined) {
  if (!token) return null;
  return prisma.invite.findFirst({ where: { token, usedAt: null, expiresAt: { gt: new Date() } } });
}

/**
 * Whether a new account may be created, using up the invite if the shop needs one.
 * One atomic update, so two sign-ups can't share a link.
 */
export async function claimInviteForSignUp(token: string | undefined, email: string) {
  if (!SIGN_UP_BY_INVITE) return true;
  if (!token) return false;
  const { count } = await prisma.invite.updateMany({
    where: { token, usedAt: null, expiresAt: { gt: new Date() } },
    data: { usedAt: new Date(), usedByEmail: email },
  });
  return count === 1;
}

/** The links the admin can still hand out, newest first. */
export async function getOpenInvites() {
  const invites = await prisma.invite.findMany({
    where: { usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
    select: { id: true, token: true, note: true, expiresAt: true },
  });
  return invites.map(({ token, ...invite }) => ({ ...invite, link: inviteUrl(token) }));
}
