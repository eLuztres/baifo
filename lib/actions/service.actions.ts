'use server';

import { z } from 'zod';
import slugify from 'slugify';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/db/prisma';
import { isAdmin } from '@/lib/auth-guard';
import { localize } from '@/lib/category';
import { SERVICES_CATEGORY_SLUG } from '@/lib/constants';
import type { TranslationKey } from '@/lib/i18n-core';
import { getShopLocale } from '@/lib/i18n-server';
import { LISTING_DAYS } from '@/lib/marketplace/config';
import { formatError } from '@/lib/utils';
import { insertServiceSchema } from '@/lib/validators';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Publishes a service in Servicios and one of its subcategories; it stays online like a classified ad. */
export async function createService(data: z.infer<typeof insertServiceSchema>) {
  try {
    if (!(await isAdmin())) return { success: false, message: 'ERROR_ADMIN_ONLY' satisfies TranslationKey };
    const { subcategoryId, image, contactPhone, name, description } = insertServiceSchema.parse(data);
    const subcategory = await prisma.category.findFirst({
      where: { id: subcategoryId, parent: { slug: SERVICES_CATEGORY_SLUG } },
      select: { id: true, parentId: true, name: true },
    });
    if (!subcategory?.parentId) return { success: false, message: 'ERROR_NOT_FOUND' satisfies TranslationKey };

    const product = await prisma.product.create({
      data: {
        name,
        description,
        kind: 'service',
        // Two babysitters may share a name; the suffix keeps the link unique.
        slug: `${slugify(name, { lower: true, strict: true })}-${crypto.randomUUID().slice(0, 6)}`,
        category: localize(subcategory.name, getShopLocale()),
        brand: '',
        images: [image],
        sourceImage: image,
        stock: 1,
        contactPhone: `+${contactPhone.replace(/\D/g, '')}`,
        expiresAt: new Date(Date.now() + LISTING_DAYS * DAY_MS),
        categories: { connect: [{ id: subcategory.parentId }, { id: subcategory.id }] },
      },
      select: { slug: true },
    });
    revalidatePath('/', 'layout');
    return { success: true, message: 'SERVICE_CREATED' satisfies TranslationKey, slug: product.slug };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}
