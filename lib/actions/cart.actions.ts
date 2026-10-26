'use server';

import { cookies } from 'next/headers';
import { CartItem } from '@/types';
import { convertToPlainObject, formatError, round2 } from '../utils';
import { getSessionUserId } from '@/lib/auth-guard';
import { findCartRow } from '@/lib/cart';
import { prisma } from '@/db/prisma';
import { addToCartSchema, idSchema, insertCartSchema } from '../validators';
import { revalidatePath } from 'next/cache';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { FREE_SHIPPING_THRESHOLD, SHIPPING_PRICE, SHOWCASE_MODE, TAX_RATE } from '@/lib/constants';
import { getT } from '@/lib/i18n-server';
import { coverPicture } from '@/lib/video';

export interface CartActionResult {
  success: boolean;
  message: string;
  /** Set when nothing was added because the cart already holds all the stock. */
  isInCart?: boolean;
}

// Calculate cart prices
const calcPrice = (items: CartItem[]) => {
  const itemsPrice = round2(
      items.reduce((acc, item) => acc + Number(item.price) * item.qty, 0)
    ),
    shippingPrice = round2(itemsPrice > FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_PRICE),
    taxPrice = round2(TAX_RATE * itemsPrice),
    totalPrice = round2(itemsPrice + taxPrice + shippingPrice);

  return {
    itemsPrice: itemsPrice.toFixed(2),
    shippingPrice: shippingPrice.toFixed(2),
    taxPrice: taxPrice.toFixed(2),
    totalPrice: totalPrice.toFixed(2),
  };
};

async function getSessionCartId() {
  return (await cookies()).get('sessionCartId')?.value;
}

async function findCart(sessionCartId?: string, userId?: string) {
  const cart = await findCartRow(sessionCartId, userId);
  if (!cart) return undefined;

  const items = await withCurrentPrices(cart.items as CartItem[]);
  return convertToPlainObject({ ...cart, items, ...calcPrice(items) });
}

// Items keep the price they were added at; the cart, the place-order page and the order use today's
// prices (and tax and shipping rules), so what is shown is what is charged.
async function withCurrentPrices(items: CartItem[]): Promise<CartItem[]> {
  if (items.length === 0) return items;

  const products = await prisma.product.findMany({
    where: { id: { in: items.map((item) => item.productId) } },
    select: { id: true, price: true },
  });
  const priceById = new Map(products.map((product) => [product.id, round2(product.price).toFixed(2)]));
  // A product that is gone keeps its stored price; checkout refuses it anyway.
  return items.map((item) => ({ ...item, price: priceById.get(item.productId) ?? item.price }));
}

/** Adds one unit. Only the product id comes from the browser: name, image, price and stock are read here. */
export async function addItemToCart(
  data: z.input<typeof addToCartSchema>
): Promise<CartActionResult> {
  try {
    const { productId } = addToCartSchema.parse(data);
    const [sessionCartId, userId, { t }] = await Promise.all([
      getSessionCartId(),
      getSessionUserId(),
      getT(),
    ]);
    if (SHOWCASE_MODE) return { success: false, message: t('SHOWCASE_NO_SALES') };
    if (!sessionCartId) {
      return { success: false, message: t('VALIDATION_CART_REQUIRED') };
    }

    const [cart, product] = await Promise.all([
      findCart(sessionCartId, userId),
      prisma.product.findFirst({ where: { id: productId } }),
    ]);
    if (!product) {
      return { success: false, message: t('ERROR_NOT_FOUND') };
    }

    const items = cart?.items ?? [];
    const existItem = items.find((x) => x.productId === productId);
    const qty = (existItem?.qty ?? 0) + 1;
    if (product.stock < qty) {
      return { success: false, message: t('TOAST_NO_STOCK'), isInCart: Boolean(existItem) };
    }

    // Built from the database row, so a tampered request can't change name, image or price.
    const item: CartItem = {
      productId,
      name: product.name,
      slug: product.slug,
      image: coverPicture(product.images) ?? product.images[0],
      price: round2(product.price).toFixed(2),
      qty,
    };
    const newItems = existItem
      ? items.map((x) => (x.productId === productId ? item : x))
      : [...items, item];

    if (cart) {
      await prisma.cart.update({
        where: { id: cart.id },
        data: {
          items: newItems as Prisma.CartUpdateitemsInput[],
          ...calcPrice(newItems),
        },
      });
    } else {
      await prisma.cart.create({
        data: insertCartSchema.parse({
          userId,
          items: newItems,
          sessionCartId,
          ...calcPrice(newItems),
        }),
      });
    }

    revalidatePath(`/product/${product.slug}`);

    return { success: true, message: t('TOAST_ADDED', { name: product.name }) };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

export async function getMyCart() {
  const [sessionCartId, userId] = await Promise.all([getSessionCartId(), getSessionUserId()]);
  return findCart(sessionCartId, userId);
}

/** For the header bag: it shows no prices, so the cart isn't repriced (that would be a second query). */
export async function getCartItemCount(): Promise<number> {
  const [sessionCartId, userId] = await Promise.all([getSessionCartId(), getSessionUserId()]);
  const cart = await findCartRow(sessionCartId, userId);
  return (cart?.items as CartItem[] | undefined)?.reduce((sum, item) => sum + item.qty, 0) ?? 0;
}

export async function removeItemFromCart(productId: string): Promise<CartActionResult> {
  try {
    const id = idSchema.parse(productId);
    const [sessionCartId, userId, { t }] = await Promise.all([
      getSessionCartId(),
      getSessionUserId(),
      getT(),
    ]);
    if (!sessionCartId) {
      return { success: false, message: t('VALIDATION_CART_REQUIRED') };
    }

    // The item keeps its name and slug, so it can be removed even after the product is gone.
    const cart = await findCart(sessionCartId, userId);
    const exist = cart?.items.find((x) => x.productId === id);
    if (!cart || !exist) {
      return { success: false, message: t('CART_ITEM_MISSING') };
    }

    const newItems =
      exist.qty === 1
        ? cart.items.filter((x) => x.productId !== id)
        : cart.items.map((x) => (x.productId === id ? { ...x, qty: x.qty - 1 } : x));

    await prisma.cart.update({
      where: { id: cart.id },
      data: {
        items: newItems as Prisma.CartUpdateitemsInput[],
        ...calcPrice(newItems),
      },
    });

    revalidatePath(`/product/${exist.slug}`);

    return { success: true, message: t('TOAST_REMOVED', { name: exist.name }) };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}
