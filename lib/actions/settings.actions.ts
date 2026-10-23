'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/db/prisma';
import { isAdmin } from '@/lib/auth-guard';
import { APP_NAME } from '@/lib/constants';
import { getT } from '@/lib/i18n-server';
import type { TranslationKey } from '@/lib/i18n-core';
import { formatError } from '@/lib/utils';
import {
  type ContactVisibility,
  contactVisibilitySchema,
  type ShopSettingsInput,
  shopSettingsSchema,
} from '@/lib/validators';
import { sendWhatsApp } from '@/lib/whatsapp';

const adminOnly = () => ({ success: false, message: 'ERROR_ADMIN_ONLY' satisfies TranslationKey });

export async function updateShopSettings(data: ShopSettingsInput) {
  try {
    if (!(await isAdmin())) return adminOnly();
    const settings = shopSettingsSchema.parse(data);
    await prisma.shopSettings.upsert({ where: { id: 1 }, create: settings, update: settings });
    return { success: true, message: 'SETTINGS_SAVED' satisfies TranslationKey };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

export async function updateContactVisibility(data: ContactVisibility) {
  try {
    if (!(await isAdmin())) return adminOnly();
    const visibility = contactVisibilitySchema.parse(data);
    await prisma.shopSettings.upsert({ where: { id: 1 }, create: visibility, update: visibility });
    // The footer is on every page.
    revalidatePath('/', 'layout');
    return { success: true, message: 'SETTINGS_SAVED' satisfies TranslationKey };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

/** Sends a test WhatsApp with the number and key in the form, so the admin knows they work before saving. */
export async function sendTestWhatsApp({ whatsappNumber, whatsappApiKey }: Pick<ShopSettingsInput, 'whatsappNumber' | 'whatsappApiKey'>) {
  try {
    if (!(await isAdmin())) return adminOnly();
    if (!whatsappNumber.trim() || !whatsappApiKey.trim()) return { success: false, message: 'VALIDATION_WHATSAPP_REQUIRED' satisfies TranslationKey };
    const { t } = await getT();
    const result = await sendWhatsApp({
      phone: whatsappNumber,
      apiKey: whatsappApiKey.trim(),
      text: t('WHATSAPP_TEST_TEXT', { shop: APP_NAME }),
    });
    if (!result.success) console.error(`[whatsapp] Test message not sent: ${result.error}`);
    return { success: result.success, message: (result.success ? 'WHATSAPP_TEST_SENT' : 'WHATSAPP_TEST_FAILED') satisfies TranslationKey };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}
