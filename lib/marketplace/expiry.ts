import { revalidatePath } from 'next/cache';
import { prisma } from '@/db/prisma';
import { sendText } from '@/lib/whatsapp-cloud/client';
import { botText, localeOf } from './messages';
import { unpaidCutoff } from './listing-payment';
import { takeDown } from './publish';

const DAY_MS = 24 * 60 * 60 * 1000;
const REMIND_BEFORE_MS = 7 * DAY_MS;

const dateOf = (date: Date) => date.toLocaleDateString('es-ES', { timeZone: 'Atlantic/Canary' });

/** Daily: listings past their end leave the shop, those ending within a week get a reminder once, and listings never
    paid expire. An expired listing keeps its pictures and texts, so the admin can enable it again (enableListing). */
export async function expireListings(now = new Date()) {
  const expired = await prisma.submission.findMany({
    where: { status: 'LIVE', expiresAt: { lte: now } },
    include: { seller: true },
  });
  for (const submission of expired) {
    await takeDown(submission.id, 'EXPIRED');
    await sendText(submission.seller.waId, botText(localeOf(submission.seller.waId), 'expired', { title: submission.title ?? '' })).catch(() => {});
  }

  // Never paid: the link stops working; nothing to tell, the person never answered.
  const unpaid = await prisma.submission.updateMany({
    // Counted from when the link was sent: saving the plan or the consent changes updatedAt.
    where: { status: 'AWAITING_PAYMENT', sentAt: { lte: unpaidCutoff(now) } },
    data: { status: 'EXPIRED' },
  });

  // Services are published by an admin, without a submission, so they leave the shop here.
  const expiredServices = await prisma.product.deleteMany({ where: { type: 'SERVICE', submission: null, expiresAt: { lte: now } } });
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
  return { expired: expired.length + expiredServices.count, unpaid: unpaid.count, reminded: ending.length };
}
