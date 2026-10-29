import { prisma } from '@/db/prisma';
import type { Submission } from '@prisma/client';
import { sendButtons as sendButtonsNow, sendList as sendListNow, sendText as sendTextNow } from '@/lib/whatsapp-cloud/client';
import type { InboundMessage } from '@/lib/whatsapp-cloud/webhook';
import { botText, CHOICE_TYPES, choiceOf, commandOf, localeOf, type BotLocale } from './messages';
import { markSold } from './listing';
import { SERVICE_AREA, WHATSAPP_LISTING_LIMIT, type ListingType } from '@/lib/constants';
import { isRateLimited } from '@/lib/rate-limit';

export const DONE_BUTTON_ID = 'done';
// A welcome list row's id, e.g. "type:WANTED".
const CHOICE_PREFIX = 'type:';

// A reply that fails (e.g. Meta is down) must not stop the listing: it is logged and the flow goes on.
const logFailure = (error: unknown) => console.error('WhatsApp reply failed', error);
const sendText = (to: string, body: string) => sendTextNow(to, body).catch(logFailure);
const sendButtons = (...args: Parameters<typeof sendButtonsNow>) => sendButtonsNow(...args).catch(logFailure);
const sendList = (...args: Parameters<typeof sendListNow>) => sendListNow(...args).catch(logFailure);

const choiceTitle = (locale: BotLocale, type: ListingType) => botText(locale, `type${type}` as const);

// The numbers stay in the text, so people can also answer by typing one; the list is the quicker way.
// While the shop only serves some places, new sellers hear it right away.
const welcomeText = (locale: BotLocale) =>
  [
    [botText(locale, 'welcome'), ...CHOICE_TYPES.map((type, index) => `${index + 1}. ${choiceTitle(locale, type)}`)].join('\n'),
    botText(locale, 'choiceHint'),
    SERVICE_AREA && botText(locale, 'serviceArea', { area: SERVICE_AREA }),
  ]
    .filter(Boolean)
    .join('\n\n');

const sendWelcome = (to: string, locale: BotLocale) =>
  sendList(
    to,
    welcomeText(locale),
    botText(locale, 'chooseButton'),
    CHOICE_TYPES.map((type) => ({ id: `${CHOICE_PREFIX}${type}`, title: choiceTitle(locale, type) }))
  );

const checklistText = (locale: BotLocale, type: ListingType) =>
  `${botText(locale, `checklist${type}` as const)}\n\n${botText(locale, 'checklistEnd')}`;

const tappedChoice = (buttonId?: string) =>
  CHOICE_TYPES.find((type) => buttonId === `${CHOICE_PREFIX}${type}`);

const hasPhotosIn = (submission: Submission) => submission.mediaIds.length > 0 || submission.rawImages.length > 0;

// An item for sale needs its photo; the other types can start from words, the AI makes their picture.
const isReady = (submission: Submission) => hasPhotosIn(submission) || (submission.type !== 'PRODUCT' && submission.rawText.trim() !== '');

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
  if (command === 'sold' || command === 'found') {
    const isSold = await markSold(seller.id);
    await sendText(message.from, botText(locale, isSold ? command : 'noLiveListing'));
    return {};
  }
  if (command === 'greeting') {
    await sendWelcome(message.from, locale);
    return {};
  }

  const open = await prisma.submission.findFirst({ where: { sellerId: seller.id, status: 'COLLECTING' }, orderBy: { createdAt: 'desc' } });
  const isEmpty = !open || (!hasPhotosIn(open) && !open.rawText);
  // A typed number or word only picks the type before anything was sent; later it's part of the description.
  const typedChoice = message.type === 'text' && message.text && isEmpty ? choiceOf(message.text) : undefined;
  const choice = (message.type === 'button' ? tappedChoice(message.buttonId) : undefined) ?? typedChoice;

  if (choice) {
    const submission = await openSubmission(seller.id);
    // More than the bare choice ("busco una tabla de surf") is already the start of the description.
    const isDescription = typedChoice !== undefined && (message.text ?? '').trim().split(/\s+/).length > 1;
    const updated = await prisma.submission.update({
      where: { id: submission.id },
      data: { type: choice, ...(isDescription ? { rawText: [submission.rawText, message.text].filter(Boolean).join('\n') } : {}) },
    });
    if (isReady(updated)) await askDone(message.from, locale, checklistText(locale, choice));
    else await sendText(message.from, checklistText(locale, choice));
    return {};
  }

  // Nothing chosen and nothing to keep yet: first the question what they want to post.
  if (!open && message.type !== 'image') {
    await sendWelcome(message.from, locale);
    return {};
  }

  const submission = open ?? (await openSubmission(seller.id));
  const hasPhotos = hasPhotosIn(submission);

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
    if (!isReady(submission)) {
      await sendText(message.from, submission.type === 'PRODUCT' ? botText(locale, 'askPhoto') : checklistText(locale, submission.type));
      return {};
    }
    // Each listing costs AI pictures and text, and anyone can write to the number: a cap per sender and day.
    if (await isRateLimited(WHATSAPP_LISTING_LIMIT, message.from)) {
      await sendText(message.from, botText(locale, 'tooManyListings'));
      return {};
    }
    await prisma.submission.update({ where: { id: submission.id }, data: { status: 'PROCESSING' } });
    await sendText(message.from, botText(locale, 'done'));
    return { shouldProcess: submission.id };
  }

  if (message.type === 'text' && message.text) {
    const updated = await prisma.submission.update({
      where: { id: submission.id },
      data: { rawText: [submission.rawText, message.text].filter(Boolean).join('\n') },
    });
    if (isReady(updated)) await askDone(message.from, locale, botText(locale, 'textReceived'));
    else await sendText(message.from, botText(locale, 'askPhoto'));
    return {};
  }

  await sendWelcome(message.from, locale);
  return {};
}
