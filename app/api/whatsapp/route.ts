import { after, NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/db/prisma';
import { handleInbound } from '@/lib/marketplace/inbound';
import { isValidSignature, parseMessages } from '@/lib/whatsapp-cloud/webhook';

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
      await handleInbound(message).catch((error) => console.error('WhatsApp message failed', message.id, error));
    }
  });
  return NextResponse.json({ ok: true });
}
