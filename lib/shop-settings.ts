import { cache } from 'react';
import { prisma } from '@/db/prisma';
import { ORDER_ALERT_EMAILS } from '@/lib/constants';
import type { ContactVisibility, ShopSettingsInput } from '@/lib/validators';

type ShopSettings = ShopSettingsInput & ContactVisibility;

const DEFAULT_SETTINGS: ShopSettings = {
  notifyEmail: true,
  alertEmails: '',
  notifyWhatsapp: false,
  whatsappNumber: '',
  whatsappApiKey: '',
  showEmail: true,
  showPhone: true,
  showInstagram: true,
};

/** How the owner hears about orders and interested customers, and which contact details the website shows.
    The .env defaults until an admin saves them; cached per request, since the footer and the sections all ask. */
export const getShopSettings = cache(async (): Promise<ShopSettings> => {
  try {
    const settings = await prisma.shopSettings.findUnique({ where: { id: 1 }, omit: { id: true, updatedAt: true } });
    // Defaults underneath, so a field the database doesn't have yet never hides contact details.
    return { ...DEFAULT_SETTINGS, ...settings };
  } catch (error) {
    // E.g. before the migration ran: alerts must still go out by email.
    console.error('[settings] Could not load shop settings, using defaults:', error);
    return DEFAULT_SETTINGS;
  }
});

/** The addresses the admin entered, or ORDER_ALERT_EMAIL / CONTACT_EMAIL from .env. */
export function getAlertEmails(settings: ShopSettingsInput) {
  const emails = settings.alertEmails
    .split(',')
    .map((email) => email.trim())
    .filter(Boolean);
  return emails.length > 0 ? emails : ORDER_ALERT_EMAILS;
}
