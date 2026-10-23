import { after, NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/db/prisma';
import { isAdminNumber } from '@/lib/marketplace/config';
import { handleSellerMessage } from '@/lib/marketplace/conversation';
import { processSubmission } from '@/lib/marketplace/processing';
import { handleAdminText, handleReviewButton, parseReviewButton } from '@/lib/marketplace/review';
import { isValidSignature, parseMessages, type InboundMessage } from '@/lib/whatsapp-cloud/webhook';

// The AI photo and text run after the response, inside this function's time.
export const maxDuration = 300;

// Meta checks the webhook URL once with the verify token set in the app dashboard.
export function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const isValid =
    params.get('hub.mode') === 'subscribe' &&
    Boolean(process.env.WHATSAPP_VERIFY_TOKEN) &&
    params.get('hub.verify_token') === process.env.WHATSAPP_VERIFY_TOKEN;
  return isValid ? new NextResponse(params.get('hub.challenge')) : new NextResponse('Forbidden', { status: 403 });
}

/** Meta retries a delivery it thinks failed; the stored message id makes the second one a no-op. */
async function isFirstDelivery(messageId: string) {
  try {
    await prisma.whatsappMessage.create({ data: { id: messageId } });
    return true;
  } catch {
    return false;
  }
}

async function handleMessage(message: InboundMessage) {
  if (isAdminNumber(message.from)) {
    const review = message.buttonId ? parseReviewButton(message.buttonId) : null;
    if (review) return handleReviewButton(review.action, review.submissionId);
    if (message.text) return handleAdminText(message.text);
    return;
  }
  const { shouldProcess } = await handleSellerMessage(message);
  if (shouldProcess) await processSubmission(shouldProcess);
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  if (!isValidSignature(rawBody, request.headers.get('x-hub-signature-256'), process.env.WHATSAPP_APP_SECRET)) {
    return new NextResponse('Invalid signature', { status: 401 });
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return new NextResponse('Invalid JSON', { status: 400 });
  }
  const messages = parseMessages(body);
  // Answer Meta at once (it retries slow webhooks); the work continues after the response.
  after(async () => {
    for (const message of messages) {
      if (!(await isFirstDelivery(message.id))) continue;
      await handleMessage(message).catch((error) => console.error('WhatsApp message failed', message.id, error));
    }
  });
  return NextResponse.json({ ok: true });
}
