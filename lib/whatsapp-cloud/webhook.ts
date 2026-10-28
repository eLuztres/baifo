import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';

/** One inbound message, reduced to what Baifo uses. */
export interface InboundMessage {
  id: string;
  /** The sender's number without +, e.g. "34600000000". */
  from: string;
  profileName?: string;
  type: 'text' | 'image' | 'button' | 'other';
  text?: string;
  mediaId?: string;
  /** The id of a tapped reply button or a picked list row. */
  buttonId?: string;
}

/** Meta signs every webhook with the app secret; anything else is not from WhatsApp. */
export function isValidSignature(rawBody: string, signature: string | null, appSecret: string | undefined) {
  if (!signature || !appSecret) return false;
  const expected = Buffer.from(`sha256=${createHmac('sha256', appSecret).update(rawBody).digest('hex')}`);
  const received = Buffer.from(signature);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

const messageSchema = z.object({
  id: z.string(),
  from: z.string(),
  type: z.string(),
  text: z.object({ body: z.string() }).optional(),
  image: z.object({ id: z.string(), caption: z.string().optional() }).optional(),
  interactive: z
    .object({
      button_reply: z.object({ id: z.string(), title: z.string() }).optional(),
      list_reply: z.object({ id: z.string(), title: z.string() }).optional(),
    })
    .optional(),
  button: z.object({ payload: z.string().optional(), text: z.string().optional() }).optional(),
});

const payloadSchema = z.object({
  entry: z.array(
    z.object({
      changes: z.array(
        z.object({
          value: z.object({
            contacts: z.array(z.object({ wa_id: z.string(), profile: z.object({ name: z.string() }).optional() })).optional(),
            messages: z.array(messageSchema).optional(),
          }),
        })
      ),
    })
  ),
});

function toInbound(message: z.infer<typeof messageSchema>, profileName?: string): InboundMessage {
  const base = { id: message.id, from: message.from, profileName };
  if (message.type === 'text' && message.text) return { ...base, type: 'text', text: message.text.body };
  if (message.type === 'image' && message.image) {
    return { ...base, type: 'image', mediaId: message.image.id, text: message.image.caption };
  }
  // A row picked from a list message counts like a tapped button.
  const reply = message.type === 'interactive' ? (message.interactive?.button_reply ?? message.interactive?.list_reply) : undefined;
  if (reply) return { ...base, type: 'button', buttonId: reply.id, text: reply.title };
  // Quick-reply buttons of templates arrive as type "button" with their payload.
  if (message.type === 'button' && message.button) {
    return { ...base, type: 'button', buttonId: message.button.payload, text: message.button.text };
  }
  return { ...base, type: 'other' };
}

/** The messages in a webhook body; status updates and unknown payloads give none. */
export function parseMessages(body: unknown): InboundMessage[] {
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) return [];
  return parsed.data.entry.flatMap((entry) =>
    entry.changes.flatMap(({ value }) => {
      const names = new Map(value.contacts?.map((contact) => [contact.wa_id, contact.profile?.name]));
      return (value.messages ?? []).map((message) => toInbound(message, names.get(message.from)));
    })
  );
}
