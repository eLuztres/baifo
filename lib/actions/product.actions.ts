'use server';
import { prisma } from '@/db/prisma';
import { formatError } from '../utils';
import { CONTACT_LIMIT } from '../constants';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { z } from 'zod';
import { isAdmin } from '@/lib/auth-guard';
import type { TranslationKey } from '@/lib/i18n-core';
import { isRateLimited } from '@/lib/rate-limit';
import { clientIp } from '@/lib/sign-in-limit';

/** The seller's WhatsApp link of a product that has one (classifieds); fetched on a click, so the number isn't in the page.
    Limited per IP, so a script can't collect every seller's number. */
export async function getProductContact(productId: string) {
  const id = z.string().uuid().safeParse(productId);
  if (!id.success) return null;
  if (await isRateLimited(CONTACT_LIMIT, clientIp(await headers()))) return { isRateLimited: true } as const;
  // Taken-down listings are deleted; this also hides one past its end before the daily expiry has run.
  const product = await prisma.product.findFirst({
    where: { id: id.data, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
    select: { contactPhone: true },
  });
  const digits = product?.contactPhone?.replace(/\D/g, '');
  return digits ? { whatsappUrl: `https://wa.me/${digits}` } : null;
}

/** The email of a listing's person, under the same rules as the number: fetched on a click and limited per IP. */
export async function getProductEmail(productId: string) {
  const id = z.string().uuid().safeParse(productId);
  if (!id.success) return null;
  if (await isRateLimited(CONTACT_LIMIT, clientIp(await headers()))) return { isRateLimited: true } as const;
  const product = await prisma.product.findFirst({
    where: { id: id.data, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
    select: { submission: { select: { contactEmail: true } } },
  });
  const email = product?.submission?.contactEmail;
  return email ? { email } : null;
}

/** The WhatsApp link of a Mercadillo, under the same rules: fetched on a click and limited per IP. */
export async function getMercadilloContact(mercadilloId: string) {
  const id = z.string().uuid().safeParse(mercadilloId);
  if (!id.success) return null;
  if (await isRateLimited(CONTACT_LIMIT, clientIp(await headers()))) return { isRateLimited: true } as const;
  const mercadillo = await prisma.mercadillo.findUnique({ where: { id: id.data }, select: { contactPhone: true } });
  const digits = mercadillo?.contactPhone?.replace(/\D/g, '');
  return digits ? { whatsappUrl: `https://wa.me/${digits}` } : null;
}

/** The WhatsApp link of a partner's mercadillo, under the same rules: fetched on a click and limited per IP. */
export async function getPartnerContact(partnerId: string) {
  const id = z.string().uuid().safeParse(partnerId);
  if (!id.success) return null;
  if (await isRateLimited(CONTACT_LIMIT, clientIp(await headers()))) return { isRateLimited: true } as const;
  const partner = await prisma.partner.findUnique({ where: { id: id.data }, select: { contactPhone: true } });
  const digits = partner?.contactPhone?.replace(/\D/g, '');
  return digits ? { whatsappUrl: `https://wa.me/${digits}` } : null;
}

// Delete a product
export async function deleteProduct(id: string) {
  try {
    if (!(await isAdmin())) {
      return { success: false, message: 'ERROR_ADMIN_ONLY' satisfies TranslationKey };
    }
    const [productExists, orderItemCount] = await Promise.all([
      prisma.product.findFirst({ where: { id } }),
      prisma.orderItem.count({ where: { productId: id } }),
    ]);

    if (!productExists) {
      return { success: false, message: 'ERROR_NOT_FOUND' satisfies TranslationKey };
    }

    // Order items cascade with the product, so deleting it would empty past orders.
    if (orderItemCount > 0) {
      return { success: false, message: 'ADMIN_PRODUCT_HAS_ORDERS' satisfies TranslationKey };
    }

    await prisma.product.delete({ where: { id } });

    // Admins also delete rings right in the store.
    revalidatePath('/', 'layout');

    return {
      success: true,
      message: 'ADMIN_PRODUCT_DELETED' satisfies TranslationKey,
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

