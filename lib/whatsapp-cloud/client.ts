// WhatsApp Cloud API (Meta Graph API) calls for the Baifo number. Plain fetch, no SDK.
// Env is read on each call so tests and scripts can set it late.

const GRAPH_URL = 'https://graph.facebook.com';

export interface ReplyButton {
  /** Comes back in the webhook when tapped, e.g. "approve:<submission id>" (max 256 chars). */
  id: string;
  /** What the button shows (max 20 chars). */
  title: string;
}

interface TemplateParameter {
  type: 'text';
  text: string;
}

/** Meta's error code when the 24-hour window is closed and only a template may be sent. */
export const WINDOW_CLOSED_CODE = 131047;

export class WhatsappError extends Error {
  constructor(
    message: string,
    readonly code?: number
  ) {
    super(message);
  }
}

const graphVersion = () => process.env.WHATSAPP_GRAPH_VERSION || 'v23.0';

function token() {
  const value = process.env.WHATSAPP_TOKEN;
  if (!value) throw new WhatsappError('WHATSAPP_TOKEN is missing in .env');
  return value;
}

async function graph<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${GRAPH_URL}/${graphVersion()}/${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: `Bearer ${token()}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new WhatsappError(result.error?.message ?? response.statusText, result.error?.code);
  return result as T;
}

async function sendMessage(to: string, message: Record<string, unknown>) {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!phoneNumberId) throw new WhatsappError('WHATSAPP_PHONE_NUMBER_ID is missing in .env');
  return graph<{ messages: { id: string }[] }>(`${phoneNumberId}/messages`, {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    ...message,
  });
}

export const sendText = (to: string, body: string) =>
  sendMessage(to, { type: 'text', text: { body, preview_url: true } });

export const sendImage = (to: string, link: string, caption?: string) =>
  sendMessage(to, { type: 'image', image: { link, caption } });

/** A message with up to three reply buttons, optionally under a picture. */
export function sendButtons(to: string, body: string, buttons: ReplyButton[], imageLink?: string) {
  return sendMessage(to, {
    type: 'interactive',
    interactive: {
      type: 'button',
      ...(imageLink ? { header: { type: 'image', image: { link: imageLink } } } : {}),
      body: { text: body.slice(0, 1024) },
      action: { buttons: buttons.slice(0, 3).map((button) => ({ type: 'reply', reply: button })) },
    },
  });
}

/** An approved template: the only kind of message allowed outside the 24-hour window. */
export function sendTemplate(to: string, name: string, language: string, bodyParameters: string[] = []) {
  const parameters: TemplateParameter[] = bodyParameters.map((text) => ({ type: 'text', text }));
  return sendMessage(to, {
    type: 'template',
    template: {
      name,
      language: { code: language },
      ...(parameters.length > 0 ? { components: [{ type: 'body', parameters }] } : {}),
    },
  });
}

/** The bytes of a photo someone sent; Meta's media URLs need the token and expire after a few minutes. */
export async function downloadMedia(mediaId: string): Promise<{ data: Buffer; mimeType: string }> {
  const { url, mime_type } = await graph<{ url: string; mime_type: string }>(mediaId);
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token()}` } });
  if (!response.ok) throw new WhatsappError(`Media download failed: ${response.status}`);
  return { data: Buffer.from(await response.arrayBuffer()), mimeType: mime_type };
}
