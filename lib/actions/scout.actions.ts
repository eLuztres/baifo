'use server';

import { revalidatePath } from 'next/cache';
import slugify from 'slugify';
import type { z } from 'zod';
import { prisma } from '@/db/prisma';
import { isAdmin } from '@/lib/auth-guard';
import type { TranslationKey } from '@/lib/i18n-core';
import { toWaId } from '@/lib/marketplace/seller';
import { formatError } from '@/lib/utils';
import { idSchema, scoutSchema, updateScoutSchema } from '@/lib/validators';

const adminOnly = () => ({ success: false, message: 'ERROR_ADMIN_ONLY' satisfies TranslationKey });

// "0034 612…" and "612…" are the same number as "34612…"; empty: none.
const toPhone = (phone: string) => {
  const digits = phone.replace(/\D/g, '').replace(/^00/, '');
  return digits ? toWaId(digits) : null;
};

/** The link's code from the name ("Ana María" → "ana-maria"), with a number when it's taken. */
async function freeCode(name: string) {
  const base = slugify(name, { lower: true, strict: true }) || 'baifo';
  for (let number = 1; ; number++) {
    const code = number === 1 ? base : `${base}${number}`;
    if (!(await prisma.scout.findUnique({ where: { code }, select: { id: true } }))) return code;
  }
}

export async function createScout(data: z.infer<typeof scoutSchema>) {
  try {
    if (!(await isAdmin())) return adminOnly();
    const { name, phone, image } = scoutSchema.parse(data);
    await prisma.scout.create({ data: { name, phone: toPhone(phone), image: image ?? null, code: await freeCode(name) } });
    revalidatePath('/admin/senaladores');
    return { success: true, message: 'SCOUT_CREATED' satisfies TranslationKey };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

/** The code stays as it was: their link and QR are already out there. */
export async function updateScout(data: z.infer<typeof updateScoutSchema>) {
  try {
    if (!(await isAdmin())) return adminOnly();
    const { id, name, phone, image } = updateScoutSchema.parse(data);
    await prisma.scout.update({ where: { id }, data: { name, phone: toPhone(phone), image: image ?? null } });
    revalidatePath('/admin/senaladores');
    return { success: true, message: 'SCOUT_UPDATED' satisfies TranslationKey };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

/** Their listings stay; they just have no señalador any more. */
export async function deleteScout(id: string) {
  try {
    if (!(await isAdmin())) return adminOnly();
    await prisma.scout.delete({ where: { id: idSchema.parse(id) } });
    revalidatePath('/admin/senaladores');
    return { success: true, message: 'SCOUT_DELETED' satisfies TranslationKey };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}
