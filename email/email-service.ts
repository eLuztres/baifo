import type { ReactElement } from 'react';
import { Resend } from 'resend';

export type EmailAddress = string | { email: string; name?: string | null };

export type EmailAttachment = {
  filename: string;
  /** File contents, or use `path` for a remote URL. */
  content?: string | Buffer;
  path?: string;
  contentType?: string;
  /** Shows the file inline: reference it in the email as `cid:<id>`. */
  inlineContentId?: string;
};

export type EmailMessage = {
  to: EmailAddress | EmailAddress[];
  subject: string;
  /** A React Email component, e.g. `<NotificationEmail ... />`. */
  react?: ReactElement;
  html?: string;
  /** Plain-text fallback. Recommended when sending `html`. */
  text?: string;
  cc?: EmailAddress | EmailAddress[];
  bcc?: EmailAddress | EmailAddress[];
  replyTo?: EmailAddress | EmailAddress[];
  attachments?: EmailAttachment[];
  /** Resend tags for filtering in the dashboard, e.g. `{ name: 'type', value: 'receipt' }`. */
  tags?: { name: string; value: string }[];
};

export type SendResult =
  | { success: true; id: string }
  | { success: false; error: string };

export type EmailUser = { email: string; name?: string | null };

type EmailServiceOptions = {
  apiKey?: string;
  /** Default sender, e.g. `My Shop <hello@myshop.com>`. */
  from: string;
  /** Default reply-to address. */
  replyTo?: string;
  /** Inject a client (tests). Defaults to a Resend client built from `apiKey`. */
  client?: Pick<Resend, 'emails' | 'batch'>;
  /** Looks users up by id for `sendToUser`. */
  findUser?: (userId: string) => Promise<EmailUser | null>;
  logger?: Pick<Console, 'info' | 'error'>;
};

// Resend accepts at most 100 messages per batch request.
const BATCH_LIMIT = 100;

function formatAddress(address: EmailAddress): string {
  if (typeof address === 'string') return address;
  const name = address.name?.replace(/["<>]/g, '').trim();
  return name ? `${name} <${address.email}>` : address.email;
}

function formatAddresses(value?: EmailAddress | EmailAddress[]) {
  if (value === undefined) return undefined;
  return (Array.isArray(value) ? value : [value]).map(formatAddress);
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return String(error);
}

/**
 * Sends transactional emails through Resend.
 *
 * - Never throws: every method resolves to a `SendResult`, so a failing email
 *   can't break an order or sign-up flow. Failures are logged.
 * - Without an API key it runs in dry-run mode and only logs what it would send,
 *   which keeps local development working without Resend credentials.
 */
export class EmailService {
  private readonly client: Pick<Resend, 'emails' | 'batch'> | null;
  private readonly from: string;
  private readonly replyTo?: string;
  private readonly findUser?: EmailServiceOptions['findUser'];
  private readonly logger: Pick<Console, 'info' | 'error'>;

  constructor(options: EmailServiceOptions) {
    this.client =
      options.client ?? (options.apiKey ? new Resend(options.apiKey) : null);
    this.from = options.from;
    this.replyTo = options.replyTo;
    this.findUser = options.findUser;
    this.logger = options.logger ?? console;
  }

  get isDryRun() {
    return this.client === null;
  }

  /** Send one email. */
  async send(message: EmailMessage): Promise<SendResult> {
    const payload = this.toPayload(message);
    if (!payload) {
      return { success: false, error: 'Email needs a recipient and `react`, `html` or `text` content' };
    }

    if (!this.client) {
      this.logger.info(`[email:dry-run] "${payload.subject}" -> ${payload.to.join(', ')}`);
      return { success: true, id: 'dry-run' };
    }

    try {
      const { data, error } = await this.client.emails.send(payload);
      if (error || !data) throw error ?? new Error('No response from Resend');
      return { success: true, id: data.id };
    } catch (error) {
      const message = errorMessage(error);
      this.logger.error(`[email] Failed to send "${payload.subject}": ${message}`);
      return { success: false, error: message };
    }
  }

  /**
   * Send one email per user, each addressed individually (recipients don't see
   * each other). `build` creates the message for each user, so it can be personalised.
   */
  async sendToUsers(
    users: EmailUser[],
    build: (user: EmailUser) => Omit<EmailMessage, 'to'>
  ): Promise<SendResult[]> {
    const messages = users.map((user) => ({ ...build(user), to: user }));
    if (!this.client) {
      return Promise.all(messages.map((m) => this.send(m)));
    }

    const results: SendResult[] = [];
    for (let i = 0; i < messages.length; i += BATCH_LIMIT) {
      const chunk = messages.slice(i, i + BATCH_LIMIT);
      // The batch endpoint doesn't support attachments; send those one by one.
      if (chunk.some((m) => m.attachments?.length)) {
        results.push(...(await Promise.all(chunk.map((m) => this.send(m)))));
        continue;
      }
      results.push(...(await this.sendBatch(chunk)));
    }
    return results;
  }

  /** Look a user up by id and send them an email. */
  async sendToUser(
    userId: string,
    build: (user: EmailUser) => Omit<EmailMessage, 'to'>
  ): Promise<SendResult> {
    if (!this.findUser) {
      return { success: false, error: 'EmailService was created without `findUser`' };
    }
    try {
      const user = await this.findUser(userId);
      if (!user?.email) return { success: false, error: `User ${userId} not found` };
      return this.send({ ...build(user), to: user });
    } catch (error) {
      const message = errorMessage(error);
      this.logger.error(`[email] Failed to look up user ${userId}: ${message}`);
      return { success: false, error: message };
    }
  }

  private async sendBatch(messages: EmailMessage[]): Promise<SendResult[]> {
    const payloads = messages.map((m) => this.toPayload(m));
    const valid = payloads.filter((p): p is NonNullable<typeof p> => p !== null);
    const invalid: SendResult = { success: false, error: 'Email needs a recipient and content' };

    try {
      const { data, error } = await this.client!.batch.send(valid);
      if (error || !data) throw error ?? new Error('No response from Resend');
      let next = 0;
      return payloads.map((p) =>
        p ? { success: true as const, id: data.data[next++]?.id ?? '' } : invalid
      );
    } catch (error) {
      const message = errorMessage(error);
      this.logger.error(`[email] Batch of ${valid.length} failed: ${message}`);
      return payloads.map(() => ({ success: false as const, error: message }));
    }
  }

  private toPayload(message: EmailMessage) {
    const to = formatAddresses(message.to) ?? [];
    if (to.length === 0 || !(message.react || message.html || message.text)) return null;

    const replyTo = formatAddresses(message.replyTo) ?? (this.replyTo ? [this.replyTo] : undefined);

    // Resend's types require exactly one of react/html/text to be present.
    const content = message.react
      ? { react: message.react, ...(message.text && { text: message.text }) }
      : message.html
        ? { html: message.html, ...(message.text && { text: message.text }) }
        : { text: message.text as string };

    return {
      from: this.from,
      to,
      subject: message.subject,
      ...content,
      cc: formatAddresses(message.cc),
      bcc: formatAddresses(message.bcc),
      replyTo,
      attachments: message.attachments,
      tags: message.tags,
    };
  }
}
