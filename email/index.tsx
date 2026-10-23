import { SENDER_EMAIL, APP_NAME, SERVER_URL, CONTACT_EMAIL, ORDER_ALERT_EMAILS } from '@/lib/constants';
import { Order } from '@/types';
import { EmailService, type SendResult } from './email-service';
import PurchaseReceiptEmail from './purchase-receipt';
import NotificationEmail, { type NotificationEmailProps } from './templates/notification-email';
import WelcomeEmail from './templates/welcome-email';
import { getShopLocale } from './shop-locale';
import { getTranslator, type Locale } from '@/lib/i18n';
import { formatCurrency, paymentMethodLabel } from '@/lib/utils';

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

/** Sent when an order is paid, in the buyer's language when known. */
export const sendPurchaseReceipt = async ({
  order,
  locale = getShopLocale(),
}: {
  order: Order;
  locale?: Locale;
}): Promise<SendResult> => {
  const result = await emailService.send({
    to: order.user,
    subject: getTranslator(locale)('RECEIPT_SUBJECT', { id: order.id }),
    react: <PurchaseReceiptEmail order={order} locale={locale} />,
    tags: [{ name: 'type', value: 'purchase-receipt' }],
  });
  if (!result.success) console.error(`[email] Receipt for ${order.id} not sent: ${result.error}`);
  return result;
};

/**
 * Tells the shop owner about every new order (paid online, or placed with cash on delivery),
 * so nobody has to watch the admin page. Written in the shop's default language.
 */
export const sendOrderAlert = async (order: Order, to = ORDER_ALERT_EMAILS) => {
  if (to.length === 0) return;

  const locale = getShopLocale();
  const t = getTranslator(locale);
  const total = formatCurrency(order.totalPrice);
  const method = paymentMethodLabel(t, order.paymentMethod);
  const { fullName, streetAddress, postalCode, city, country } = order.shippingAddress;

  const result = await emailService.send({
    to,
    // Hitting reply writes straight to the buyer.
    replyTo: order.user,
    subject: t('ORDER_ALERT_SUBJECT', { total, name: order.user.name }),
    react: (
      <NotificationEmail
        lang={locale}
        heading={t('ORDER_ALERT_HEADING', { total })}
        paragraphs={[
          order.isPaid ? t('ORDER_ALERT_PAID', { method }) : t('ORDER_ALERT_UNPAID', { method }),
          ...order.orderitems.map((item) => `${item.qty} × ${item.name} · ${formatCurrency(item.price)}`),
          t('ORDER_ALERT_CUSTOMER', { name: order.user.name, email: order.user.email }),
          t('ORDER_ALERT_SHIP_TO', { address: `${fullName}, ${streetAddress}, ${postalCode} ${city}, ${country}` }),
        ]}
        action={{ label: t('ORDER_ALERT_ACTION'), url: `${SERVER_URL}/order/${order.id}` }}
      />
    ),
    tags: [{ name: 'type', value: 'order-alert' }],
  });
  if (!result.success) console.error(`[email] Order alert for ${order.id} not sent: ${result.error}`);
};

/** Tells the shop owner that a customer reserved a ring, or (showcase mode, no `reservedUntil`) is interested in one.
    Written in the shop's default language. */
export const sendReservationAlert = async ({
  product,
  customer,
  reservedUntil,
  to = ORDER_ALERT_EMAILS,
}: {
  product: { name: string; slug: string };
  customer: { name: string; email?: string; contact: string; message?: string };
  reservedUntil?: Date;
  to?: string[];
}) => {
  if (to.length === 0) return;

  const locale = getShopLocale();
  const t = getTranslator(locale);
  const until = reservedUntil ? formatReservationEnd(reservedUntil, locale) : '';
  const subject = t(reservedUntil ? 'RESERVE_ALERT_SUBJECT' : 'INTEREST_ALERT_SUBJECT', { name: product.name, customer: customer.name });

  const result = await emailService.send({
    to,
    // Hitting reply writes straight to the customer, when they left an email.
    replyTo: customer.email ? { name: customer.name, email: customer.email } : undefined,
    subject,
    react: (
      <NotificationEmail
        lang={locale}
        heading={subject}
        paragraphs={[
          t(reservedUntil ? 'RESERVE_ALERT_TEXT' : 'INTEREST_ALERT_TEXT', { customer: customer.name, email: customer.contact, name: product.name, until }),
          ...(customer.message ? [customer.message] : []),
        ]}
        action={{ label: t('RESERVE_ALERT_ACTION'), url: `${SERVER_URL}/product/${product.slug}` }}
      />
    ),
    tags: [{ name: 'type', value: 'reservation-alert' }],
  });
  if (!result.success) console.error(`[email] Reservation alert for ${product.slug} not sent: ${result.error}`);
};

/** The end of a reservation as people read it, with the time zone so nobody misreads the hour. */
export const formatReservationEnd = (date: Date, locale: string) =>
  date.toLocaleString(locale, { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' });

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
