'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/db/prisma';
import { isAdmin } from '@/lib/auth-guard';
import { localize, RING_ORDER } from '@/lib/category';
import type { Locale, TranslationKey } from '@/lib/i18n-core';
import { aiErrorText } from '@/lib/ai-errors';
import { formatError } from '@/lib/utils';
import slugify from 'slugify';
import { getEnabledLocales, getShopLocale, getT } from '@/lib/i18n-server';
import { translateText, writeCategoryText } from '@/lib/marketplace/ai';
import {
  categorySchema,
  idSchema,
  ringOrderSchema,
  subcategorySchema,
  updateCategorySchema,
  updateSubcategorySchema,
} from '@/lib/validators';

/** The store's categories in their ring order, with everything the circle and the editor need; subcategories stay out. */
export async function getStoreCategories() {
  return prisma.category.findMany({
    where: { parentId: null },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    select: {
      id: true,
      slug: true,
      name: true,
      text: true,
      image: true,
      keywords: true,
      scene: true,
      sceneVariants: true,
    },
  });
}

export type StoreCategory = Awaited<ReturnType<typeof getStoreCategories>>[number];

/** The subcategories of a store category in their order. */
export async function getSubcategories(parentSlug: string) {
  return prisma.category.findMany({
    where: { parent: { slug: parentSlug } },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    select: { id: true, slug: true, name: true },
  });
}

export type Subcategory = Awaited<ReturnType<typeof getSubcategories>>[number];

/** The categories as admin forms list them: id and name in the admin's language. */
export async function getCategoryOptions(locale: Locale) {
  const categories = await getStoreCategories();
  return categories.map(({ id, name }) => ({ id, name: localize(name, locale) }));
}

/** Every ring with the categories it is in, for the admin's category tree (sold-out rings too). */
export async function getCatalogRings() {
  return prisma.product.findMany({
    orderBy: RING_ORDER,
    select: {
      id: true,
      slug: true,
      name: true,
      images: true,
      price: true,
      stock: true,
      reservedUntil: true,
      categories: { select: { id: true } },
      submission: { select: { id: true } },
      type: true,
    },
  });
}

export type CatalogRing = Awaited<ReturnType<typeof getCatalogRings>>[number];

const adminOnly = () => ({ success: false, message: 'ERROR_ADMIN_ONLY' satisfies TranslationKey });

// The circle is on the home page and every product page swipes through it.
const revalidateStore = () => revalidatePath('/', 'layout');

export async function createCategory(data: z.infer<typeof categorySchema>) {
  try {
    if (!(await isAdmin())) return adminOnly();
    const category = categorySchema.parse(data);
    const last = await prisma.category.aggregate({ _max: { sortOrder: true } });
    await prisma.category.create({ data: { ...category, sortOrder: (last._max.sortOrder ?? -1) + 1 } });
    revalidateStore();
    return { success: true, message: 'CATEGORY_CREATED' satisfies TranslationKey };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

/** Saves a category; when its scene changed, the ids of its rings come back so the admin can redo their photos. */
export async function updateCategory(data: z.infer<typeof updateCategorySchema>) {
  try {
    if (!(await isAdmin())) return adminOnly();
    const { id, ...category } = updateCategorySchema.parse(data);
    const before = await prisma.category.findUnique({
      where: { id },
      select: { scene: true, sceneVariants: true, products: { select: { id: true } } },
    });
    if (!before) return { success: false, message: 'ERROR_NOT_FOUND' satisfies TranslationKey };

    await prisma.category.update({ where: { id }, data: category });
    revalidateStore();

    const isSceneChanged =
      before.scene !== category.scene || before.sceneVariants.join('\n') !== category.sceneVariants.join('\n');
    return {
      success: true,
      message: 'CATEGORY_UPDATED' satisfies TranslationKey,
      ringIds: isSceneChanged ? before.products.map((product) => product.id) : [],
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

/** Adds a subcategory at the end; its link name comes from the shop's language. */
export async function createSubcategory(parentSlug: string, data: z.infer<typeof subcategorySchema>) {
  try {
    if (!(await isAdmin())) return adminOnly();
    const { name } = subcategorySchema.parse(data);
    const parent = await prisma.category.findUnique({ where: { slug: parentSlug }, select: { id: true } });
    if (!parent) return { success: false, message: 'ERROR_NOT_FOUND' satisfies TranslationKey };

    const baseSlug = slugify(localize(name, getShopLocale()), { lower: true, strict: true });
    // Slugs are shop-wide: a subcategory named like a store category gets its parent's slug in front.
    const isTaken = await prisma.category.count({ where: { slug: baseSlug } });
    const last = await prisma.category.aggregate({ where: { parentId: parent.id }, _max: { sortOrder: true } });
    await prisma.category.create({
      data: {
        slug: isTaken ? `${parentSlug}-${baseSlug}` : baseSlug,
        name,
        text: {},
        scene: '',
        parentId: parent.id,
        sortOrder: (last._max.sortOrder ?? -1) + 1,
      },
    });
    revalidateStore();
    return { success: true, message: 'CATEGORY_CREATED' satisfies TranslationKey };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

/** Renames a subcategory; its link name stays, so shared links keep working. */
export async function updateSubcategory(data: z.infer<typeof updateSubcategorySchema>) {
  try {
    if (!(await isAdmin())) return adminOnly();
    const { id, name } = updateSubcategorySchema.parse(data);
    await prisma.category.update({ where: { id, parentId: { not: null } }, data: { name } });
    revalidateStore();
    return { success: true, message: 'CATEGORY_UPDATED' satisfies TranslationKey };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

/** Removes the category only; its rings stay in the shop and in their other categories. */
export async function deleteCategory(id: string) {
  try {
    if (!(await isAdmin())) return adminOnly();
    await prisma.category.delete({ where: { id: idSchema.parse(id) } });
    revalidateStore();
    return { success: true, message: 'CATEGORY_DELETED' satisfies TranslationKey };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

const categoryTextsSchema = z.object({ name: z.string().trim().min(1).max(60), text: z.string().trim().max(300) });

/** The name and text the admin wrote in the shop's language, in every other language of the shop; never improved, only translated. */
export async function translateCategory(data: z.infer<typeof categoryTextsSchema>) {
  try {
    if (!(await isAdmin())) return adminOnly();
    const { name, text } = categoryTextsSchema.parse(data);
    const from = getShopLocale();
    const made = await translateText({ title: name, description: text }, from, getEnabledLocales().filter((locale) => locale !== from));
    const texts = Object.fromEntries(Object.entries(made).map(([locale, item]) => [locale, { name: item?.title ?? '', text: item?.description ?? '' }]));
    return { success: true, message: '', texts: texts as Partial<Record<Locale, { name: string; text: string }>> };
  } catch (error) {
    return { success: false, message: aiErrorText((await getT()).t, error) ?? formatError(error) };
  }
}

/** The admin's notes as an inviting description, written by the AI, with the name, in every language of the shop. */
export async function improveCategory(data: z.infer<typeof categoryTextsSchema>) {
  try {
    if (!(await isAdmin())) return adminOnly();
    const { name, text } = categoryTextsSchema.parse(data);
    const shopLocale = getShopLocale();
    const made = await writeCategoryText({ title: name, description: text }, [shopLocale, ...getEnabledLocales().filter((locale) => locale !== shopLocale)]);
    // Cut to what categorySchema takes, so the improved text can always be saved.
    const texts = Object.fromEntries(Object.entries(made).map(([locale, item]) => [locale, { name: item?.title ?? '', text: (item?.description ?? '').slice(0, 300) }]));
    return { success: true, message: '', texts: texts as Partial<Record<Locale, { name: string; text: string }>> };
  } catch (error) {
    return { success: false, message: aiErrorText((await getT()).t, error) ?? formatError(error) };
  }
}

/** Puts a product or service into a category, or takes it out; one listing can be in several categories. */
export async function setProductCategory(productId: string, categoryId: string, isIn: boolean) {
  try {
    if (!(await isAdmin())) return adminOnly();
    const [product, category] = [idSchema.parse(productId), idSchema.parse(categoryId)];
    await prisma.product.update({
      where: { id: product },
      data: { categories: isIn ? { connect: { id: category } } : { disconnect: { id: category } } },
    });
    revalidateStore();
    return { success: true, message: '' };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

/** Puts one category's rings in the given order. The order is shop-wide, so they swap places among
    themselves and every other ring keeps its spot. */
export async function reorderRings(ringIds: string[]) {
  try {
    if (!(await isAdmin())) return adminOnly();
    const ids = ringOrderSchema.parse(ringIds);
    const rings = await prisma.product.findMany({ orderBy: RING_ORDER, select: { id: true, sortOrder: true } });
    const known = new Set(rings.map((ring) => ring.id));
    const reordered = ids.filter((id) => known.has(id));
    const moving = new Set(reordered);
    const order = rings.map((ring) => (moving.has(ring.id) ? reordered.shift()! : ring.id));
    const before = new Map(rings.map((ring) => [ring.id, ring.sortOrder]));

    // Numbered from 1, so rings added later (0) come first.
    await prisma.$transaction(
      order
        .map((id, index) => ({ id, sortOrder: index + 1 }))
        .filter(({ id, sortOrder }) => before.get(id) !== sortOrder)
        .map(({ id, sortOrder }) => prisma.product.update({ where: { id }, data: { sortOrder } }))
    );
    revalidateStore();
    return { success: true, message: 'RING_ORDER_SAVED' satisfies TranslationKey };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}
