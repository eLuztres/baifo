'use server';

import { revalidatePath } from 'next/cache';
import type { z } from 'zod';
import { prisma } from '@/db/prisma';
import { isAdmin } from '@/lib/auth-guard';
import type { TranslationKey } from '@/lib/i18n-core';
import { toWaId } from '@/lib/marketplace/seller';
import { formatError } from '@/lib/utils';
import { idSchema, mercadilloSchema, updateMercadilloSchema } from '@/lib/validators';

const adminOnly = () => ({ success: false, message: 'ERROR_ADMIN_ONLY' satisfies TranslationKey });

// "0034 612…" and "612…" are the same number as "34612…"; empty: no contact.
const toContactPhone = (phone: string) => {
  const digits = phone.replace(/\D/g, '').replace(/^00/, '');
  return digits ? toWaId(digits) : null;
};

// Its row is in the list, and every listing's page can link to it.
const revalidateStore = () => revalidatePath('/', 'layout');

const submissionsOf = (productIds: string[]) =>
  productIds.length > 0 ? prisma.submission.findMany({ where: { productId: { in: productIds } }, select: { id: true } }) : Promise.resolve([]);

/** Sets the Mercadillo's listings: each product and the listing behind it, so the listing's editor shows the same. */
async function setMercadilloListings(id: string, productIds: string[]) {
  const before = (await prisma.product.findMany({ where: { mercadillos: { some: { id } } }, select: { id: true } })).map((product) => product.id);
  const added = productIds.filter((productId) => !before.includes(productId));
  const removed = before.filter((productId) => !productIds.includes(productId));
  if (added.length === 0 && removed.length === 0) return;
  const toIds = (ids: string[]) => ids.map((one) => ({ id: one }));
  await prisma.mercadillo.update({
    where: { id },
    data: {
      products: { connect: toIds(added), disconnect: toIds(removed) },
      submissions: { connect: await submissionsOf(added), disconnect: await submissionsOf(removed) },
    },
  });
}

export async function createMercadillo(data: z.infer<typeof mercadilloSchema>) {
  try {
    if (!(await isAdmin())) return adminOnly();
    const { contactPhone, productIds, ...mercadillo } = mercadilloSchema.parse(data);
    const last = await prisma.mercadillo.aggregate({ _max: { sortOrder: true } });
    const created = await prisma.mercadillo.create({ data: { ...mercadillo, contactPhone: toContactPhone(contactPhone), sortOrder: (last._max.sortOrder ?? -1) + 1 } });
    if (productIds) await setMercadilloListings(created.id, productIds);
    revalidateStore();
    return { success: true, message: 'MERCADILLO_CREATED' satisfies TranslationKey };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

export async function updateMercadillo(data: z.infer<typeof updateMercadilloSchema>) {
  try {
    if (!(await isAdmin())) return adminOnly();
    const { id, contactPhone, productIds, ...mercadillo } = updateMercadilloSchema.parse(data);
    await prisma.mercadillo.update({ where: { id }, data: { ...mercadillo, contactPhone: toContactPhone(contactPhone) } });
    if (productIds) await setMercadilloListings(id, productIds);
    revalidateStore();
    return { success: true, message: 'MERCADILLO_UPDATED' satisfies TranslationKey };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

/** Removes the Mercadillo only; its listings stay online and go back to the normal list. */
export async function deleteMercadillo(id: string) {
  try {
    if (!(await isAdmin())) return adminOnly();
    await prisma.mercadillo.delete({ where: { id: idSchema.parse(id) } });
    revalidateStore();
    return { success: true, message: 'MERCADILLO_DELETED' satisfies TranslationKey };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}
