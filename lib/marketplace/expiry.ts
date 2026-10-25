import { revalidatePath } from 'next/cache';
import { prisma } from '@/db/prisma';
import { sendText } from '@/lib/whatsapp-cloud/client';
import { botText, localeOf } from './messages';
import { takeDown } from './publish';

const REMIND_BEFORE_MS = 7 * 24 * 60 * 60 * 1000;

const dateOf = (date: Date) => date.toLocaleDateString('es-ES', { timeZone: 'Atlantic/Canary' });

/** Daily: listings past their end leave the shop, those ending within a week get a reminder once. */
export async function expireListings(now = new Date()) {
  const expired = await prisma.submission.findMany({
    where: { status: 'LIVE', expiresAt: { lte: now } },
    include: { seller: true },
  });
  for (const submission of expired) {
    await takeDown(submission.id, 'EXPIRED');
    await sendText(submission.seller.waId, botText(localeOf(submission.seller.waId), 'expired', { title: submission.title ?? '' })).catch(() => {});
  }

  // Services are published by an admin, without a submission, so they leave the shop here.
  const expiredServices = await prisma.product.deleteMany({ where: { kind: 'service', submission: null, expiresAt: { lte: now } } });
  if (expiredServices.count > 0) revalidatePath('/');

  const ending = await prisma.submission.findMany({
    where: { status: 'LIVE', remindedAt: null, expiresAt: { gt: now, lte: new Date(now.getTime() + REMIND_BEFORE_MS) } },
    include: { seller: true },
  });
  for (const submission of ending) {
    await prisma.submission.update({ where: { id: submission.id }, data: { remindedAt: now } });
    const values = { title: submission.title ?? '', date: dateOf(submission.expiresAt!) };
    await sendText(submission.seller.waId, botText(localeOf(submission.seller.waId), 'expiring', values)).catch(() => {});
  }
  return { expired: expired.length + expiredServices.count, reminded: ending.length };
}
