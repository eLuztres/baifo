import { formatReservationEnd, sendOrderAlert, sendReservationAlert } from '@/email';
import { getShopLocale } from '@/email/shop-locale';
import { SERVER_URL } from '@/lib/constants';
import { getTranslator } from '@/lib/i18n';
import { getAlertEmails, getShopSettings } from '@/lib/shop-settings';
import { formatCurrency } from '@/lib/utils';
import type { ShopSettingsInput } from '@/lib/validators';
import { sendWhatsApp } from '@/lib/whatsapp';
import { Order } from '@/types';

interface RingAlert {
  product: { name: string; slug: string; images: string[] };
  customer: { name: string; email?: string; whatsapp?: string; contact: string; message?: string };
  reservedUntil?: Date;
}

async function sendOwnerWhatsApp(settings: ShopSettingsInput, lines: string[], about: string) {
  const result = await sendWhatsApp({ phone: settings.whatsappNumber, apiKey: settings.whatsappApiKey, text: lines.join('\n') });
  if (!result.success) console.error(`[whatsapp] Alert for ${about} not sent: ${result.error}`);
}

function ringWhatsAppLines({ product, customer, reservedUntil }: RingAlert) {
  const t = getTranslator(getShopLocale());
  const until = reservedUntil ? formatReservationEnd(reservedUntil, getShopLocale()) : '';
  const photo = product.images[0];
  const replyNumber = customer.whatsapp?.replace(/\D/g, '');
  return [
    t(reservedUntil ? 'WHATSAPP_RESERVE_ALERT' : 'WHATSAPP_INTEREST_ALERT', { customer: customer.name, name: product.name, until }),
    t('WHATSAPP_ALERT_CONTACT', { contact: customer.contact }),
    ...(replyNumber ? [t('WHATSAPP_ALERT_REPLY', { url: `https://wa.me/${replyNumber}` })] : []),
    ...(customer.message ? [`💬 ${customer.message}`] : []),
    ...(photo ? [t('WHATSAPP_ALERT_PHOTO', { url: new URL(photo, SERVER_URL).href })] : []),
    t('WHATSAPP_ALERT_RING', { url: `${SERVER_URL}/product/${product.slug}` }),
  ];
}

/** Tells the owner, by email and/or WhatsApp as set on the admin overview, that someone reserved or likes a ring. */
export async function alertOwnerOfRing(alert: RingAlert) {
  const settings = await getShopSettings();
  await Promise.all([
    settings.notifyEmail && sendReservationAlert({ ...alert, to: getAlertEmails(settings) }),
    settings.notifyWhatsapp && sendOwnerWhatsApp(settings, ringWhatsAppLines(alert), alert.product.slug),
  ]);
}

/** Tells the owner about a new order, by email and/or WhatsApp as set on the admin overview. */
export async function alertOwnerOfOrder(order: Order) {
  const settings = await getShopSettings();
  const t = getTranslator(getShopLocale());
  const lines = [
    t('ORDER_ALERT_HEADING', { total: formatCurrency(order.totalPrice) }),
    ...order.orderitems.map((item) => `${item.qty} × ${item.name}`),
    t('WHATSAPP_ALERT_CONTACT', { contact: `${order.user.name} (${order.user.email})` }),
    `${SERVER_URL}/order/${order.id}`,
  ];
  await Promise.all([
    settings.notifyEmail && sendOrderAlert(order, getAlertEmails(settings)),
    settings.notifyWhatsapp && sendOwnerWhatsApp(settings, lines, `order ${order.id}`),
  ]);
}
