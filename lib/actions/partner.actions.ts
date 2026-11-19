'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/db/prisma';
import { isAdmin } from '@/lib/auth-guard';
import { SERVER_URL } from '@/lib/constants';
import type { TranslationKey } from '@/lib/i18n-core';
import { getShopLocale, getT } from '@/lib/i18n-server';
import { localize } from '@/lib/localize';
import { HOUSE_SELLER } from '@/lib/marketplace/config';
import { toWaId } from '@/lib/marketplace/seller';
import { getSignedInPartner, hasPartnerRoom, newPartnerToken } from '@/lib/partner-access';
import { getDefaultPlaceId } from '@/lib/places';
import { formatError } from '@/lib/utils';
import { idSchema, ownPartnerSchema, partnerSchema, updatePartnerSchema } from '@/lib/validators';

const adminOnly = () => ({ success: false, message: 'ERROR_ADMIN_ONLY' satisfies TranslationKey });

// "0034 612…" and "612…" are the same number as "34612…"; empty: no contact.
const toContactPhone = (phone: string) => {
  const digits = phone.replace(/\D/g, '').replace(/^00/, '');
  return digits ? toWaId(digits) : null;
};

/** The private link that opens a partner's panel. */
const panelUrl = (token: string) => `${SERVER_URL}/gestionar/${token}`;

// Its card is in Explore, its page and its listings' pages show its name and sign.
const revalidatePartner = () => revalidatePath('/', 'layout');

export async function createPartner(data: z.infer<typeof partnerSchema>) {
  try {
    if (!(await isAdmin())) return adminOnly();
    const { contactPhone, ...partner } = partnerSchema.parse(data);
    await prisma.partner.create({ data: { ...partner, contactPhone: toContactPhone(contactPhone), token: newPartnerToken() } });
    revalidatePartner();
    return { success: true, message: 'PARTNER_CREATED' satisfies TranslationKey };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

export async function updatePartner(data: z.infer<typeof updatePartnerSchema>) {
  try {
    if (!(await isAdmin())) return adminOnly();
    const { id, contactPhone, ...partner } = updatePartnerSchema.parse(data);
    await prisma.partner.update({ where: { id }, data: { ...partner, contactPhone: toContactPhone(contactPhone) } });
    revalidatePartner();
    return { success: true, message: 'PARTNER_UPDATED' satisfies TranslationKey };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

/** Removes the mercadillo with its listings: they were the partner's own, made in its panel. */
export async function deletePartner(id: string) {
  try {
    if (!(await isAdmin())) return adminOnly();
    const partnerId = idSchema.parse(id);
    const listings = await prisma.submission.findMany({ where: { partnerId, productId: { not: null } }, select: { productId: true } });
    await prisma.$transaction([
      prisma.product.deleteMany({ where: { id: { in: listings.map((listing) => listing.productId!) } } }),
      // Its listings go with it (onDelete: Cascade).
      prisma.partner.delete({ where: { id: partnerId } }),
    ]);
    revalidatePartner();
    return { success: true, message: 'PARTNER_DELETED' satisfies TranslationKey };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

/** A new panel link: the old one stops working at once, also in every browser that opened it. */
export async function renewPartnerLink(id: string) {
  try {
    if (!(await isAdmin())) return { ...adminOnly(), url: '' };
    const { token } = await prisma.partner.update({ where: { id: idSchema.parse(id) }, data: { token: newPartnerToken() }, select: { token: true } });
    revalidatePath('/admin/socios');
    return { success: true, message: 'PARTNER_LINK_RENEWED' satisfies TranslationKey, url: panelUrl(token) };
  } catch (error) {
    return { success: false, message: formatError(error), url: '' };
  }
}

/** The partner changes its own name, words, sign and WhatsApp in its panel. */
export async function updateOwnPartner(data: z.infer<typeof ownPartnerSchema>) {
  try {
    const partner = await getSignedInPartner();
    if (!partner) return { success: false, message: 'PARTNER_LINK_INVALID' satisfies TranslationKey };
    const { contactPhone, ...own } = ownPartnerSchema.parse(data);
    await prisma.partner.update({ where: { id: partner.id }, data: { ...own, contactPhone: toContactPhone(contactPhone) } });
    revalidatePartner();
    return { success: true, message: 'PARTNER_UPDATED' satisfies TranslationKey };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// A partner offers things and makes events; services and wanted ads are the admin's to make for now.
const partnerListingTypeSchema = z.enum(['PRODUCT', 'EVENT']);

/** "+ Anuncio" or "+ Evento" in the panel: an empty draft in the partner's mercadillo, as "Nuevo anuncio" does for the admin. */
export async function startPartnerListing(type: unknown) {
  const [{ t }, partner] = await Promise.all([getT(), getSignedInPartner()]);
  if (!partner) return { success: false, message: t('PARTNER_LINK_INVALID') };
  const parsed = partnerListingTypeSchema.safeParse(type);
  if (!parsed.success) return { success: false, message: t('PARTNER_LINK_INVALID') };
  if (!(await hasPartnerRoom(partner))) return { success: false, message: t('PARTNER_FULL', { max: partner.maxListings }) };
  // The house seller until its WhatsApp is set on publishing, as for the admin's own drafts.
  const seller = await prisma.seller.upsert({ where: { waId: HOUSE_SELLER }, update: {}, create: { waId: HOUSE_SELLER } });
  const submission = await prisma.submission.create({
    data: {
      sellerId: seller.id,
      status: 'COLLECTING',
      // Made in the editor like the admin's: no WhatsApp review, it goes online once written.
      createdByAdmin: true,
      type: parsed.data,
      usesAi: false,
      placeId: await getDefaultPlaceId(),
      partnerId: partner.id,
      sellerName: localize(partner.name, getShopLocale()).slice(0, 30) || null,
    },
  });
  return { success: true, message: '', id: submission.id };
}
