'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/db/prisma';
import { isAdmin } from '@/lib/auth-guard';
import type { TranslationKey } from '@/lib/i18n-core';
import { INVITE_DAYS, inviteUrl, newInviteToken } from '@/lib/invites';
import { formatError } from '@/lib/utils';
import { idSchema, inviteNoteSchema } from '@/lib/validators';

const DAY_MS = 24 * 60 * 60 * 1000;

/** A new one-time sign-up link; the admin copies it and sends it to the person. */
export async function createInvite(note: string) {
  try {
    if (!(await isAdmin())) return { success: false, message: 'ERROR_ADMIN_ONLY' satisfies TranslationKey };
    const token = newInviteToken();
    await prisma.invite.create({
      data: { token, note: inviteNoteSchema.parse(note) || null, expiresAt: new Date(Date.now() + INVITE_DAYS * DAY_MS) },
    });
    revalidatePath('/admin/users');
    return { success: true, message: 'ADMIN_INVITE_CREATED' satisfies TranslationKey, link: inviteUrl(token) };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

/** Takes a link back before anyone used it. */
export async function deleteInvite(id: string) {
  try {
    if (!(await isAdmin())) return { success: false, message: 'ERROR_ADMIN_ONLY' satisfies TranslationKey };
    await prisma.invite.delete({ where: { id: idSchema.parse(id) } });
    revalidatePath('/admin/users');
    return { success: true, message: 'ADMIN_INVITE_DELETED' satisfies TranslationKey };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}
