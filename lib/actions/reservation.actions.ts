'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { z } from 'zod';
import { getSession } from '@/lib/auth-guard';
import { prisma } from '@/db/prisma';
import { formatReservationEnd, sendUserNotification } from '@/email';
import { OWNER_MESSAGE_LIMIT, RESERVATION_HOURS } from '@/lib/constants';
import { getT } from '@/lib/i18n-server';
import { alertOwnerOfRing } from '@/lib/owner-alerts';
import { isRateLimited } from '@/lib/rate-limit';
import { clientIp } from '@/lib/sign-in-limit';
import { formatError } from '@/lib/utils';
import { idSchema, reserveRequestSchema } from '@/lib/validators';

function revalidateRing(slug: string) {
  revalidatePath(`/product/${slug}`);
  revalidatePath('/');
  revalidatePath('/admin/products');
}

export type ReserveRequest = z.infer<typeof reserveRequestSchema>;

// Both forms email or WhatsApp the owner and are open to guests, so a script could flood the owner.
const isOwnerMessageLimited = async () => isRateLimited(OWNER_MESSAGE_LIMIT, clientIp(await headers()));

/** Showcase mode: tells the shop who likes a ring and how to reach them. Nothing is reserved. */
export async function sendInterest(request: ReserveRequest) {
  try {
    const { productId, name, channel, contact, message } = reserveRequestSchema.parse(request);
    const [{ t }, product, session] = await Promise.all([
      getT(),
      prisma.product.findUnique({ where: { id: productId }, select: { name: true, slug: true, images: true } }),
      getSession(),
    ]);
    if (!product) return { success: false, message: t('ERROR_NOT_FOUND') };

    const user = session?.user;
    const customerName = user?.name || name;
    const customerContact = contact ? `${channel ?? 'contact'}: ${contact}` : user?.email;
    if (!customerName || !customerContact) return { success: false, message: t('RESERVE_MISSING') };
    if (await isOwnerMessageLimited()) return { success: false, message: t('TOO_MANY_REQUESTS') };

    await alertOwnerOfRing({
      product,
      customer: {
        name: customerName,
        email: user?.email ?? (channel === 'email' ? contact : undefined),
        whatsapp: channel === 'whatsapp' ? contact : undefined,
        contact: customerContact,
        message,
      },
    });
    return { success: true, message: '' };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

/** Keeps a ring for RESERVATION_HOURS, so there is time to pay. Guests leave a name and a way to reach them instead of signing in. */
export async function reserveProduct(request: ReserveRequest) {
  try {
    const { productId, name, channel, contact, message } = reserveRequestSchema.parse(request);
    const [{ t, locale }, product, session] = await Promise.all([
      getT(),
      prisma.product.findUnique({ where: { id: productId }, select: { name: true, slug: true, images: true } }),
      getSession(),
    ]);
    if (!product) return { success: false, message: t('ERROR_NOT_FOUND') };

    const user = session?.user;
    const customerName = user?.name || name;
    const customerContact = contact ? `${channel ?? 'contact'}: ${contact}` : user?.email;
    if (!customerName || !customerContact) return { success: false, message: t('RESERVE_MISSING') };
    if (await isOwnerMessageLimited()) return { success: false, message: t('TOO_MANY_REQUESTS') };

    const now = new Date();
    const reservedUntil = new Date(now.getTime() + RESERVATION_HOURS * 60 * 60 * 1000);
    // Conditional update: only one of two customers clicking at the same moment can win the ring.
    const { count } = await prisma.product.updateMany({
      where: {
        id: productId,
        stock: { gt: 0 },
        OR: [{ reservedUntil: null }, { reservedUntil: { lte: now } }, ...(user?.id ? [{ reservedById: user.id }] : [])],
      },
      data: { reservedUntil, reservedById: user?.id ?? null },
    });
    if (count === 0) return { success: false, message: t('RESERVE_TAKEN') };

    revalidateRing(product.slug);

    const until = formatReservationEnd(reservedUntil, locale);
    await Promise.all([
      alertOwnerOfRing({
        product,
        customer: {
          name: customerName,
          email: user?.email ?? (channel === 'email' ? contact : undefined),
          whatsapp: channel === 'whatsapp' ? contact : undefined,
          contact: customerContact,
          message,
        },
        reservedUntil,
      }),
      user?.id &&
        sendUserNotification(user.id, {
          lang: locale,
          subject: t('RESERVE_EMAIL_SUBJECT', { name: product.name }),
          heading: t('RESERVE_EMAIL_HEADING'),
          paragraphs: [t('RESERVE_EMAIL_TEXT', { name: product.name, until })],
          action: { label: t('RESERVE_EMAIL_ACTION'), path: `/product/${product.slug}` },
        }),
    ]);

    return { success: true, message: '', until: reservedUntil.toISOString() };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

/** Frees a ring again; allowed for the customer who reserved it and for admins. */
export async function cancelReservation(productId: string) {
  try {
    const id = idSchema.parse(productId);
    const [{ t }, session] = await Promise.all([getT(), getSession()]);
    const user = session?.user;
    if (!user?.id) return { success: false, message: t('RESERVE_SIGN_IN_REQUIRED') };

    const isAdmin = user.role === 'admin';
    const product = await prisma.product.findUnique({ where: { id }, select: { slug: true } });
    if (!product) return { success: false, message: t('ERROR_NOT_FOUND') };

    const { count } = await prisma.product.updateMany({
      where: { id, ...(isAdmin ? {} : { reservedById: user.id }) },
      data: { reservedUntil: null, reservedById: null },
    });
    if (count === 0) return { success: false, message: t('RESERVE_NOT_YOURS') };

    revalidateRing(product.slug);
    return { success: true, message: t('RESERVE_CANCELLED') };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}
