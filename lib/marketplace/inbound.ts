import type { InboundMessage } from '@/lib/whatsapp-cloud/webhook';
import { isAdminNumber } from './config';
import { handleSellerMessage } from './conversation';
import { processSubmission } from './processing';
import { handleAdminText, handleReviewButton, parseReviewButton } from './review';

/** One WhatsApp message, from the WhatsApp webhook: the admin reviews, everyone else sells. */
export async function handleInbound(message: InboundMessage) {
  if (isAdminNumber(message.from)) {
    const review = message.buttonId ? parseReviewButton(message.buttonId) : null;
    if (review) return handleReviewButton(review.action, review.submissionId, message.from);
    if (message.text) return handleAdminText(message.text, message.from);
    return;
  }
  const { shouldProcess } = await handleSellerMessage(message);
  if (shouldProcess) await processSubmission(shouldProcess);
}
