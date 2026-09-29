import { SENDER_EMAIL, APP_NAME, SERVER_URL, CONTACT_EMAIL } from '@/lib/constants';
import { Order } from '@/types';
import dotenv from 'dotenv';
dotenv.config();
import { EmailService, type SendResult } from './email-service';
import PurchaseReceiptEmail from './purchase-receipt';
import NotificationEmail, { type NotificationEmailProps } from './templates/notification-email';
import WelcomeEmail from './templates/welcome-email';
import { getTranslator, type Locale } from '@/lib/i18n';

export { EmailService } from './email-service';
export type { EmailMessage, EmailUser, SendResult } from './email-service';
export { default as NotificationEmail } from './templates/notification-email';
export { default as EmailLayout } from './components/email-layout';

/** Shared instance for the whole app. Import this rather than creating new ones. */
export const emailService = new EmailService({
  apiKey: process.env.RESEND_API_KEY,
  from: `${APP_NAME} <${SENDER_EMAIL}>`,
  // Customer replies land in the shop's inbox instead of the no-reply sender
  replyTo: CONTACT_EMAIL ? `${APP_NAME} <${CONTACT_EMAIL}>` : undefined,
  findUser: async (userId) => {
    // Loaded lazily so the service itself stays usable without a database (tests).
    const { prisma } = await import('@/db/prisma');
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });
    // 'NO_NAME' is the schema's placeholder; don't greet people with it.
    return user && { email: user.email, name: user.name === 'NO_NAME' ? null : user.name };
  },
});

const WELCOME_TIMEOUT_MS = 5000;

/**
 * Sent once, when a new account is created (email sign-up or first Google login).
 * Callers await it during sign-up, so it gives up after 5 s rather than hold the
 * login; the send itself never throws.
 */
export const sendWelcomeEmail = async (
  user: { email: string; name?: string | null },
  locale: Locale = 'en'
): Promise<SendResult> => {
  const name = user.name && user.name !== 'NO_NAME' ? user.name : null;
  const send = emailService.send({
    to: { email: user.email, name },
    subject: getTranslator(locale)('WELCOME_SUBJECT', { shop: APP_NAME }),
    react: <WelcomeEmail name={name} locale={locale} />,
    tags: [{ name: 'type', value: 'welcome' }],
  });
  const timeout = new Promise<SendResult>((resolve) =>
    setTimeout(
      () => resolve({ success: false, error: `timed out after ${WELCOME_TIMEOUT_MS} ms` }),
      WELCOME_TIMEOUT_MS
    )
  );
  const result = await Promise.race([send, timeout]);
  if (result.success) console.info(`[email] Welcome email sent to ${user.email}`);
  else console.error(`[email] Welcome email to ${user.email} not sent: ${result.error}`);
  return result;
};

export const sendPurchaseReceipt =({ order }: { order: Order }) =>
  emailService.send({
    to: order.user,
    subject: `Order Confirmation ${order.id}`,
    react: <PurchaseReceiptEmail order={order} />,
    tags: [{ name: 'type', value: 'purchase-receipt' }],
  });

/**
 * Send a simple branded message to one user by id.
 *
 * @example
 * await sendUserNotification(order.userId, {
 *   subject: 'Your order is on its way',
 *   heading: 'Your order is on its way',
 *   paragraphs: ['It was shipped today and should arrive within 3–5 days.'],
 *   action: { label: 'View order', path: `/order/${order.id}` },
 * });
 */
export const sendUserNotification = (
  userId: string,
  {
    subject,
    action,
    ...content
  }: Omit<NotificationEmailProps, 'name' | 'action'> & {
    subject: string;
    /** `path` is relative to the site, e.g. `/user/orders`. */
    action?: { label: string; path: string };
  }
) =>
  emailService.sendToUser(userId, (user) => ({
    subject,
    react: (
      <NotificationEmail
        {...content}
        name={user.name}
        action={action && { label: action.label, url: `${SERVER_URL}${action.path}` }}
      />
    ),
    tags: [{ name: 'type', value: 'notification' }],
  }));
