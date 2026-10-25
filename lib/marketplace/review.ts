import type { Seller, Submission } from '@prisma/client';
import { prisma } from '@/db/prisma';
import { formatCurrency } from '@/lib/utils';
import { sendButtons, sendText } from '@/lib/whatsapp-cloud/client';
import { categoryName, findCategory, getListingCategories } from './catalog';
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

const reviewCaption = (submission: Submission, category: string) =>
  [
    `🆕 *${submission.title ?? 'Sin título'}*`,
    submission.price ? `💶 ${formatCurrency(submission.price.toString())}` : '💶 sin precio',
    category ? `🏷️ ${category}` : '',
    '',
    submission.description ?? '',
    submission.rawText ? `\n✍️ El vendedor: "${submission.rawText.slice(0, 200)}"` : '',
  ]
    .filter((line, index) => line || index === 3)
    .join('\n');

type SubmissionWithSeller = Submission & { seller: Seller };

/** Shows the admin the listing as the AI made it, with approve / edit / reject buttons. */
export async function sendForReview(submission: SubmissionWithSeller) {
  const reviewer = ADMIN_WHATSAPP_NUMBER;
  if (!reviewer) throw new Error('ADMIN_WHATSAPP_NUMBER is missing in .env');
  const category = categoryName(findCategory(await getListingCategories(), submission.category), 'es');
  await sendButtons(
    reviewer,
    reviewCaption(submission, category),
    [
      { id: `approve:${submission.id}`, title: '✅ Aprobar' },
      { id: `edit:${submission.id}`, title: '✏️ Editar' },
      { id: `reject:${submission.id}`, title: '❌ Rechazar' },
    ],
    submission.images[0] ?? submission.rawImages[0]
  );
}

const findInReview = (submissionId: string) =>
  prisma.submission.findFirst({ where: { id: submissionId, status: 'IN_REVIEW' }, include: { seller: true } });

/** Approved: the seller gets the link to choose a plan and pay. Null when it isn't waiting for review. */
export async function approveSubmission(submissionId: string) {
  const submission = await findInReview(submissionId);
  if (!submission) return null;
  await prisma.submission.update({ where: { id: submission.id }, data: { status: 'AWAITING_PAYMENT' } });
  const locale = localeOf(submission.seller.waId);
  await sendText(submission.seller.waId, botText(locale, 'approved', { url: publishUrl(submission.payToken) }));
  return submission;
}

/** Rejected: the seller gets a polite message. Null when it isn't waiting for review. */
export async function rejectSubmission(submissionId: string) {
  const submission = await findInReview(submissionId);
  if (!submission) return null;
  await prisma.submission.update({ where: { id: submission.id }, data: { status: 'REJECTED' } });
  await sendText(submission.seller.waId, botText(localeOf(submission.seller.waId), 'rejected'));
  return submission;
}

/** The admin (real or simulated) tapped a review button. */
export async function handleReviewButton(action: ReviewAction, submissionId: string, adminWaId: string) {
  if (action === 'edit') return sendText(adminWaId, EDIT_HELP);
  const submission = action === 'approve' ? await approveSubmission(submissionId) : await rejectSubmission(submissionId);
  if (!submission) return sendText(adminWaId, 'Este anuncio ya no está pendiente de revisión.');
  const title = submission.title ?? submission.id;
  return sendText(adminWaId, action === 'approve' ? `✅ Aprobado, enlace enviado: ${title}` : `❌ Rechazado: ${title}`);
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

/** A text from the admin: an edit of the listing most recently sent to this admin for review. */
export async function handleAdminText(text: string, adminWaId: string) {
  const edit = parseEdit(text);
  const where = { status: 'IN_REVIEW' as const };
  const submission = await prisma.submission.findFirst({ where, orderBy: { updatedAt: 'desc' } });
  if (!edit || !submission) {
    const pending = await prisma.submission.count({ where });
    return sendText(adminWaId, `${pending} anuncio(s) pendiente(s) de revisión.\n${EDIT_HELP}`);
  }
  let value = edit.value;
  // "cat Muebles": the category is kept by slug, so the name must match one of the store's.
  if (edit.field === 'category') {
    const categories = await getListingCategories();
    const category = findCategory(categories, edit.value);
    if (!category) return sendText(adminWaId, `No conozco esa categoría. Elige una: ${categories.map((item) => categoryName(item, 'es')).join(', ')}`);
    value = category.slug;
  }
  const updated = await prisma.submission.update({
    where: { id: submission.id },
    data: { [edit.field]: value },
    include: { seller: true },
  });
  return sendForReview(updated);
}
