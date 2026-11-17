import { revalidatePath } from 'next/cache';
import { prisma } from '@/db/prisma';
import { isEventOver, startOfShopDay } from '@/lib/event-date';
import { nextEventStart, REPEAT_SELECT, repeatOf } from '@/lib/event-repeat';
import { sendText } from '@/lib/whatsapp-cloud/client';
import { LISTING_PAYMENT_ON_PAGE, publishUrl } from './config';
import { botText, localeOf } from './messages';
import { unpaidCutoff } from './listing-payment';
import { takeDown } from './publish';
import { sendWithTemplateFallback } from './templates';

const DAY_MS = 24 * 60 * 60 * 1000;
const REMIND_BEFORE_MS = 7 * DAY_MS;

const dateOf = (date: Date) => date.toLocaleDateString('es-ES', { timeZone: 'Atlantic/Canary' });

/** Just after midnight (and before the daily run): a repeating event whose date is over shows its next one, on the same
    listing; after its last date, or once the next is past its period, it finishes. */
export async function moveRepeatingEvents(now = new Date()) {
  const due = await prisma.submission.findMany({
    where: { status: 'LIVE', type: 'EVENT', repeatFrequency: { not: null }, startsAt: { lt: startOfShopDay(now) } },
    select: { id: true, productId: true, expiresAt: true, ...REPEAT_SELECT },
  });
  let moved = 0;
  let finished = 0;
  for (const event of due) {
    const rule = repeatOf(event);
    const next = rule && nextEventStart(rule, now);
    if (!next || (event.expiresAt && next >= event.expiresAt)) {
      await takeDown(event.id, 'FINISHED');
      finished++;
      continue;
    }
    await prisma.submission.update({ where: { id: event.id }, data: { startsAt: next } });
    if (event.productId) await prisma.product.updateMany({ where: { id: event.productId }, data: { startsAt: next } });
    moved++;
  }
  if (moved > 0) revalidatePath('/');
  return { moved, finished };
}

/** Daily: listings past their end leave the shop, those ending within a week get a reminder once, and listings never
    paid expire. An expired listing keeps its pictures and texts, so the admin can enable it again (enableListing). */
export async function expireListings(now = new Date()) {
  const repeating = await moveRepeatingEvents(now);
  // First, so a past event finishes instead of expiring: nothing to renew, nothing to tell.
  const pastEvents = await prisma.submission.findMany({
    where: { status: 'LIVE', type: 'EVENT', startsAt: { lt: now } },
    select: { id: true, startsAt: true },
  });
  const finished = pastEvents.filter((event) => isEventOver(event.startsAt!, now));
  for (const event of finished) await takeDown(event.id, 'FINISHED');

  const expired = await prisma.submission.findMany({
    where: { status: 'LIVE', expiresAt: { lte: now } },
    include: { seller: true },
  });
  for (const submission of expired) {
    // An event at the end of its period simply finishes: no "publish it again?".
    if (submission.type === 'EVENT') {
      await takeDown(submission.id, 'FINISHED');
      continue;
    }
    await takeDown(submission.id, 'EXPIRED');
    const values = { title: submission.title ?? '', url: publishUrl(submission.payToken) };
    await sendText(submission.seller.waId, botText(localeOf(submission.seller.waId), 'expired', values)).catch(() => {});
  }

  // Never paid: the link stops working; nothing to tell, the person never answered.
  const unpaid = await prisma.submission.updateMany({
    // Counted from when the link was sent: saving the plan or the consent changes updatedAt.
    // Without payment on the page, a listing the person said OK to waits for the admin, however long.
    where: { status: 'AWAITING_PAYMENT', sentAt: { lte: unpaidCutoff(now) }, ...(!LISTING_PAYMENT_ON_PAGE && { consentAt: null }) },
    data: { status: 'EXPIRED' },
  });

  // Services are published by an admin, without a submission, so they leave the shop here.
  const expiredServices = await prisma.product.deleteMany({ where: { type: 'SERVICE', submission: null, expiresAt: { lte: now } } });
  if (expiredServices.count > 0) revalidatePath('/');

  const ending = await prisma.submission.findMany({
    // Events end by themselves: no reminder to renew them.
    where: { status: 'LIVE', type: { not: 'EVENT' }, remindedAt: null, expiresAt: { gt: now, lte: new Date(now.getTime() + REMIND_BEFORE_MS) } },
    include: { seller: true },
  });
  for (const submission of ending) {
    await prisma.submission.update({ where: { id: submission.id }, data: { remindedAt: now } });
    const { waId } = submission.seller;
    // The private page renews it: another payment, the same photos and texts.
    const values = { title: submission.title ?? '', date: dateOf(submission.expiresAt!), url: publishUrl(submission.payToken) };
    await sendWithTemplateFallback(waId, () => sendText(waId, botText(localeOf(waId), 'expiring', values)), {
      key: 'listingExpiring',
      locale: localeOf(waId),
      parameters: [values.title, values.date, values.url],
    }).catch(() => {});
  }
  const expiredEvents = expired.filter((submission) => submission.type === 'EVENT').length;
  return {
    moved: repeating.moved,
    finished: finished.length + repeating.finished + expiredEvents,
    expired: expired.length - expiredEvents + expiredServices.count, unpaid: unpaid.count,
    reminded: ending.length,
  };
}
