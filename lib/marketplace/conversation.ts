import { prisma } from '@/db/prisma';
import { sendButtons as sendButtonsNow, sendText as sendTextNow } from '@/lib/whatsapp-cloud/client';
import type { InboundMessage } from '@/lib/whatsapp-cloud/webhook';
import { botText, commandOf, localeOf, type BotLocale } from './messages';
import { markSold } from './listing';
import { SERVICE_AREA } from '@/lib/constants';

export const DONE_BUTTON_ID = 'done';

// A reply that fails (e.g. Meta is down) must not stop the listing: it is logged and the flow goes on.
const logFailure = (error: unknown) => console.error('WhatsApp reply failed', error);
const sendText = (to: string, body: string) => sendTextNow(to, body).catch(logFailure);
const sendButtons = (...args: Parameters<typeof sendButtonsNow>) => sendButtonsNow(...args).catch(logFailure);

// While the shop only serves some places, new sellers hear it right away.
const welcomeText = (locale: BotLocale) =>
  [botText(locale, 'welcome'), SERVICE_AREA && botText(locale, 'serviceArea', { area: SERVICE_AREA })].filter(Boolean).join('\n\n');

/** What a seller message changes, and whether the AI work can start. */
export interface SellerReply {
  shouldProcess?: string;
}

// The photos of an album arrive in parallel webhooks; the lock keeps them from opening two submissions.
async function openSubmission(sellerId: string) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${sellerId}))`;
    return (
      (await tx.submission.findFirst({ where: { sellerId, status: 'COLLECTING' }, orderBy: { createdAt: 'desc' } })) ??
      tx.submission.create({ data: { sellerId } })
    );
  });
}

const askDone = (to: string, locale: BotLocale, text: string) =>
  sendButtons(to, text, [{ id: DONE_BUTTON_ID, title: botText(locale, 'buttonDone') }]);

/**
 * A message from a seller. Photos and texts collect in one open submission until the seller taps
 * "Listo"; then it moves to PROCESSING and the caller starts the AI work.
 */
export async function handleSellerMessage(message: InboundMessage): Promise<SellerReply> {
  const locale = localeOf(message.from);
  const seller = await prisma.seller.upsert({
    where: { waId: message.from },
    update: message.profileName ? { name: message.profileName } : {},
    create: { waId: message.from, name: message.profileName },
  });

  const command = message.type === 'text' && message.text ? commandOf(message.text) : undefined;
  if (command === 'help') {
    await sendText(message.from, botText(locale, 'help'));
    return {};
  }
  if (command === 'cancel') {
    const { count } = await prisma.submission.deleteMany({ where: { sellerId: seller.id, status: 'COLLECTING' } });
    await sendText(message.from, botText(locale, count > 0 ? 'cancelled' : 'nothingToCancel'));
    return {};
  }
  if (command === 'sold') {
    const isSold = await markSold(seller.id);
    await sendText(message.from, botText(locale, isSold ? 'sold' : 'noLiveListing'));
    return {};
  }

  const submission = await openSubmission(seller.id);
  const hasPhotos = submission.mediaIds.length > 0 || submission.rawImages.length > 0;

  if (message.type === 'image' && message.mediaId) {
    await prisma.submission.update({
      where: { id: submission.id },
      data: {
        mediaIds: { push: message.mediaId },
        ...(message.text ? { rawText: [submission.rawText, message.text].filter(Boolean).join('\n') } : {}),
      },
    });
    // An album arrives as one message per photo: confirm only the first, not every one.
    if (!hasPhotos) await askDone(message.from, locale, botText(locale, 'photoReceived'));
    return {};
  }

  if (message.type === 'button' && message.buttonId === DONE_BUTTON_ID) {
    if (!hasPhotos) {
      await sendText(message.from, botText(locale, 'askPhoto'));
      return {};
    }
    await prisma.submission.update({ where: { id: submission.id }, data: { status: 'PROCESSING' } });
    await sendText(message.from, botText(locale, 'done'));
    return { shouldProcess: submission.id };
  }

  if (message.type === 'text' && message.text) {
    await prisma.submission.update({
      where: { id: submission.id },
      data: { rawText: [submission.rawText, message.text].filter(Boolean).join('\n') },
    });
    if (hasPhotos) await askDone(message.from, locale, botText(locale, 'textReceived'));
    else await sendText(message.from, submission.rawText ? botText(locale, 'askPhoto') : welcomeText(locale));
    return {};
  }

  await sendText(message.from, welcomeText(locale));
  return {};
}
