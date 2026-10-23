import type { Submission } from '@prisma/client';
import { prisma } from '@/db/prisma';
import { formatCurrency } from '@/lib/utils';
import { sendButtons, sendText } from '@/lib/whatsapp-cloud/client';
import { ADMIN_WHATSAPP_NUMBER, publishUrl } from './config';
import { botText, localeOf } from './messages';
import { parsePrice } from './price';

// Button ids carry the action and the submission, e.g. "approve:<uuid>".
const ACTIONS = ['approve', 'edit', 'reject'] as const;
type ReviewAction = (typeof ACTIONS)[number];

export function parseReviewButton(buttonId: string): { action: ReviewAction; submissionId: string } | null {
  const [action, submissionId] = buttonId.split(':');
  return ACTIONS.includes(action as ReviewAction) && submissionId ? { action: action as ReviewAction, submissionId } : null;
}

const EDIT_HELP =
  'Responde con lo que cambias, por ejemplo:\nprecio 25\ntítulo Mesa de teca\ndesc Mesa robusta, poco usada.\ncat Muebles';

const reviewCaption = (submission: Submission) =>
  [
    `🆕 *${submission.title ?? 'Sin título'}*`,
    submission.price ? `💶 ${formatCurrency(submission.price.toString())}` : '💶 sin precio',
    submission.category ? `🏷️ ${submission.category}` : '',
    '',
    submission.description ?? '',
    submission.rawText ? `\n✍️ El vendedor: "${submission.rawText.slice(0, 200)}"` : '',
  ]
    .filter((line, index) => line || index === 3)
    .join('\n');

/** Shows the admin the listing as the AI made it, with approve / edit / reject buttons. */
export async function sendForReview(submission: Submission) {
  if (!ADMIN_WHATSAPP_NUMBER) throw new Error('ADMIN_WHATSAPP_NUMBER is missing in .env');
  await sendButtons(
    ADMIN_WHATSAPP_NUMBER,
    reviewCaption(submission),
    [
      { id: `approve:${submission.id}`, title: '✅ Aprobar' },
      { id: `edit:${submission.id}`, title: '✏️ Editar' },
      { id: `reject:${submission.id}`, title: '❌ Rechazar' },
    ],
    submission.images[0] ?? submission.rawImages[0]
  );
}

async function findInReview(submissionId: string) {
  return prisma.submission.findFirst({
    where: { id: submissionId, status: 'IN_REVIEW' },
    include: { seller: true },
  });
}

/** The admin tapped a review button. */
export async function handleReviewButton(action: ReviewAction, submissionId: string) {
  const submission = await findInReview(submissionId);
  if (!submission) return sendText(ADMIN_WHATSAPP_NUMBER!, 'Este anuncio ya no está pendiente de revisión.');
  const locale = localeOf(submission.seller.waId);

  if (action === 'edit') return sendText(ADMIN_WHATSAPP_NUMBER!, EDIT_HELP);

  if (action === 'reject') {
    await prisma.submission.update({ where: { id: submission.id }, data: { status: 'REJECTED' } });
    await sendText(submission.seller.waId, botText(locale, 'rejected'));
    return sendText(ADMIN_WHATSAPP_NUMBER!, `❌ Rechazado: ${submission.title ?? submission.id}`);
  }

  await prisma.submission.update({ where: { id: submission.id }, data: { status: 'AWAITING_PAYMENT' } });
  await sendText(submission.seller.waId, botText(locale, 'approved', { url: publishUrl(submission.payToken) }));
  return sendText(ADMIN_WHATSAPP_NUMBER!, `✅ Aprobado, enlace enviado: ${submission.title}`);
}

type ListingField = 'price' | 'title' | 'description' | 'category';

const EDIT_PATTERNS: [ListingField, RegExp][] = [
  ['price', /^(?:precio|price)\s+([\s\S]+)$/i],
  ['title', /^(?:t[ií]tulo|title)\s+([\s\S]+)$/i],
  ['description', /^(?:desc|descripci[oó]n|description)\s+([\s\S]+)$/i],
  ['category', /^(?:cat|categor[ií]a|category)\s+([\s\S]+)$/i],
];

/** "precio 25" → { field: 'price', value: '25.00' }; null when the text is no edit. */
export function parseEdit(text: string): { field: ListingField; value: string } | null {
  for (const [field, pattern] of EDIT_PATTERNS) {
    const match = text.trim().match(pattern);
    if (!match) continue;
    const value = field === 'price' ? parsePrice(`${match[1]}€`) : match[1].trim();
    return value ? { field, value } : null;
  }
  return null;
}

/** A text from the admin: an edit of the listing most recently sent for review. */
export async function handleAdminText(text: string) {
  const edit = parseEdit(text);
  const submission = await prisma.submission.findFirst({ where: { status: 'IN_REVIEW' }, orderBy: { updatedAt: 'desc' } });
  if (!edit || !submission) {
    const pending = await prisma.submission.count({ where: { status: 'IN_REVIEW' } });
    return sendText(ADMIN_WHATSAPP_NUMBER!, `${pending} anuncio(s) pendiente(s) de revisión.\n${EDIT_HELP}`);
  }
  const updated = await prisma.submission.update({ where: { id: submission.id }, data: { [edit.field]: edit.value } });
  return sendForReview(updated);
}
