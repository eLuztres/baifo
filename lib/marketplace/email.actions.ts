'use server';

import { z } from 'zod';
import { isAdmin } from '@/lib/auth-guard';
import { sendListingsEmail } from './listings-email';
import { saveMarketplaceSettings } from './settings';

const settingsSchema = z.object({
  listingsEmail: z.string().trim().email(),
  sendOnPublish: z.boolean(),
});

/** Saves where the list goes (and whether it goes after every new listing), then sends it right away. */
export async function saveAndSendListingsEmail(input: z.input<typeof settingsSchema>) {
  if (!(await isAdmin())) return { success: false, message: 'Solo para administradores' };
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: 'invalidEmail' };
  await saveMarketplaceSettings(parsed.data);
  const result = await sendListingsEmail({ isAutomatic: false });
  return result.success ? { success: true, message: 'sent' } : { success: false, message: 'notSent' };
}

/** Only saves the settings (the switch), without sending. */
export async function saveListingsEmailSettings(input: z.input<typeof settingsSchema>) {
  if (!(await isAdmin())) return { success: false, message: 'Solo para administradores' };
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: 'invalidEmail' };
  await saveMarketplaceSettings(parsed.data);
  return { success: true, message: 'saved' };
}
