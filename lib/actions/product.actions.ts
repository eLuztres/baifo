'use server';
import { prisma } from '@/db/prisma';
import { convertToPlainObject, formatError } from '../utils';
import { CONTACT_LIMIT, PAGE_SIZE, PRICE_CLASSES, SHOWS_PRICES } from '../constants';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { insertProductSchema, updateProductSchema } from '../validators';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { isAdmin } from '@/lib/auth-guard';
import type { TranslationKey } from '@/lib/i18n-core';
import { isRateLimited } from '@/lib/rate-limit';
import { clientIp } from '@/lib/sign-in-limit';

// Get single product by it's slug
export async function getProductBySlug(slug: string) {
  return await prisma.product.findFirst({
    where: { slug: slug },
    // Showcase mode: the price is never read, so no page can send it.
    omit: { price: !SHOWS_PRICES },
  });
}

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
  return digits ? { phone: `+${digits}`, whatsappUrl: `https://wa.me/${digits}` } : null;
}

// Get single product by it's ID
export async function getProductById(productId: string) {
  // Only the admin form uses it, and it returns the seller's number: a server action is callable by anyone.
  if (!(await isAdmin())) return null;
  const data = await prisma.product.findFirst({
    where: { id: productId },
    include: { categories: { select: { id: true } } },
  });
  if (!data) return null;

  // The form edits the categories as a list of ids.
  const { categories, ...product } = data;
  return convertToPlainObject({ ...product, categoryIds: categories.map((category) => category.id) });
}

interface GetAllProductsParams {
  query: string;
  limit?: number;
  page: number;
  category?: string;
  price?: string;
  rating?: string;
  sort?: string;
}

// Postgres compares accents strictly, so names are matched without them: "opalo" finds "ópalo".
const withoutAccents = (text: string) => text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

// A one-maker shop has few products, so comparing every name here is cheap.
async function productIdsMatching(query: string) {
  const needle = withoutAccents(query);
  const products = await prisma.product.findMany({ select: { id: true, name: true } });
  return products.filter((product) => withoutAccents(product.name).includes(needle)).map((product) => product.id);
}

// "min-max", e.g. "51-100"; anything else ("all") means no price filter.
const PRICE_RANGE = /^(\d+)-(\d+)$/;

function priceFilter(price?: string): Prisma.ProductWhereInput {
  const range = PRICE_RANGE.exec(price ?? '');
  return range ? { price: { gte: Number(range[1]), lte: Number(range[2]) } } : {};
}

function ratingFilter(rating?: string): Prisma.ProductWhereInput {
  const minRating = Number(rating);
  return rating && Number.isFinite(minRating) ? { rating: { gte: minRating } } : {};
}

// Get all products
export async function getAllProducts({
  query,
  limit = PAGE_SIZE,
  page,
  category,
  price,
  rating,
  sort,
}: GetAllProductsParams) {
  // One filter for the page and the count, so totalPages matches the search.
  const where: Prisma.ProductWhereInput = {
    ...(query && query !== 'all' ? { id: { in: await productIdsMatching(query) } } : {}),
    ...(category && category !== 'all' ? { category } : {}),
    ...priceFilter(price),
    ...ratingFilter(rating),
  };
  // Page numbers come from the URL and the action is callable from the client:
  // 0, negative or NaN would make Prisma throw, and the page size is capped.
  const currentPage = Math.max(1, Math.floor(page) || 1);
  const pageSize = Math.min(Math.max(Math.floor(limit) || PAGE_SIZE, 1), 50);

  const [data, dataCount] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy:
        sort === 'lowest'
          ? { price: 'asc' }
          : sort === 'highest'
          ? { price: 'desc' }
          : sort === 'rating'
          ? { rating: 'desc' }
          : { createdAt: 'desc' },
      skip: (currentPage - 1) * pageSize,
      take: pageSize,
    }),
    prisma.product.count({ where }),
  ]);

  return {
    data,
    totalPages: Math.ceil(dataCount / pageSize),
  };
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

// The class decides the price, so the form can't save a price that differs from it.
const withClassPrice = <T extends { price: string; priceClass?: string | null }>(product: T): T => {
  const priceClass = PRICE_CLASSES.find((item) => item.name === product.priceClass);
  return { ...product, price: priceClass?.price ?? product.price, priceClass: priceClass?.name ?? null };
};

const toCategoryRefs = (ids: string[] = []) => ids.map((id) => ({ id }));

// Create a product
export async function createProduct(data: z.infer<typeof insertProductSchema>) {
  try {
    if (!(await isAdmin())) {
      return { success: false, message: 'ERROR_ADMIN_ONLY' satisfies TranslationKey };
    }
    const { categoryIds, ...product } = withClassPrice(insertProductSchema.parse(data));
    await prisma.product.create({ data: { ...product, categories: { connect: toCategoryRefs(categoryIds) } } });

    revalidatePath('/admin/products');

    return {
      success: true,
      message: 'ADMIN_PRODUCT_CREATED' satisfies TranslationKey,
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// Update a product
export async function updateProduct(data: z.infer<typeof updateProductSchema>) {
  try {
    if (!(await isAdmin())) {
      return { success: false, message: 'ERROR_ADMIN_ONLY' satisfies TranslationKey };
    }
    const { categoryIds, ...product } = withClassPrice(updateProductSchema.parse(data));
    const productExists = await prisma.product.findFirst({
      where: { id: product.id },
      include: { categories: { where: { parentId: { not: null } }, select: { id: true } } },
    });

    if (!productExists) {
      return { success: false, message: 'ERROR_NOT_FOUND' satisfies TranslationKey };
    }
    // The form only lists store categories, so a listing keeps its subcategory.
    const subcategoryIds = productExists.categories.map((category) => category.id);

    await prisma.product.update({
      where: { id: product.id },
      // Without categoryIds (e.g. an older form) the ring keeps its categories.
      data: { ...product, ...(categoryIds && { categories: { set: toCategoryRefs([...categoryIds, ...subcategoryIds]) } }) },
    });

    revalidatePath('/admin/products');

    return {
      success: true,
      message: 'ADMIN_PRODUCT_UPDATED' satisfies TranslationKey,
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// Get all categories
export async function getAllCategories() {
  const data = await prisma.product.groupBy({
    by: ['category'],
    _count: true,
  });

  return data;
}

// Get featured products
export async function getFeaturedProducts() {
  const data = await prisma.product.findMany({
    where: { isFeatured: true },
    orderBy: { createdAt: 'desc' },
    take: 4,
  });

  return convertToPlainObject(data);
}
