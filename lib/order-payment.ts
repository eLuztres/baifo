import { prisma } from '@/db/prisma';
import { Order, PaymentResult, ShippingAddress } from '@/types';
import { sendPurchaseReceipt } from '@/email';
import { alertOwnerOfOrder } from '@/lib/owner-alerts';
import { idSchema } from '@/lib/validators';
import type { Locale } from '@/lib/i18n';

// Deliberately not a 'use server' file: exports there become public endpoints,
// and this marks orders as paid. Only verified payment flows may call it.

const ORDER_INCLUDE = {
  orderitems: true,
  user: { select: { name: true, email: true } },
} as const;

/** An order with its items and buyer, with the Json columns typed. */
export async function findOrder(orderId: string): Promise<Order | null> {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: ORDER_INCLUDE });
  return (
    order && {
      ...order,
      shippingAddress: order.shippingAddress as ShippingAddress,
      paymentResult: order.paymentResult as PaymentResult,
    }
  );
}

interface StockedItem {
  productId: string;
  name: string;
  qty: number;
}

/** The first item whose product has less stock than ordered, or no longer exists. */
export function findShortItem<T extends StockedItem>(
  items: T[],
  products: { id: string; stock: number }[]
): T | undefined {
  const stockById = new Map(products.map((product) => [product.id, product.stock]));
  return items.find((item) => (stockById.get(item.productId) ?? 0) < item.qty);
}

export async function findItemOutOfStock<T extends StockedItem>(items: T[]) {
  const products = await prisma.product.findMany({
    where: { id: { in: items.map((item) => item.productId) } },
    select: { id: true, stock: true },
  });
  return findShortItem(items, products);
}

/** Thrown when paying an order would take a product's stock below zero. */
export class OutOfStockError extends Error {
  constructor(readonly productName: string) {
    super(`Not enough stock of ${productName}`);
    this.name = 'OutOfStockError';
  }
}

interface UpdateOrderToPaidInput {
  orderId: string;
  paymentResult?: PaymentResult;
  /** The buyer's language for the receipt; the shop's own language when unknown (webhooks, admins). */
  locale?: Locale;
}

export type UpdateOrderToPaidOutcome =
  | { status: 'paid' }
  | { status: 'already-paid'; paymentId?: string };

export async function updateOrderToPaid({
  orderId,
  paymentResult,
  locale,
}: UpdateOrderToPaidInput): Promise<UpdateOrderToPaidOutcome> {
  const id = idSchema.parse(orderId);

  const outcome = await prisma.$transaction(async (tx): Promise<UpdateOrderToPaidOutcome> => {
    // Claiming the order in the transaction makes a duplicate webhook or a second click a no-op.
    const { count } = await tx.order.updateMany({
      where: { id, isPaid: false },
      data: { isPaid: true, paidAt: new Date(), paymentResult },
    });
    if (count === 0) {
      const order = await tx.order.findUnique({ where: { id }, select: { paymentResult: true } });
      if (!order) throw new Error('ERROR_NOT_FOUND');
      return { status: 'already-paid', paymentId: (order.paymentResult as PaymentResult | null)?.id };
    }

    const items = await tx.orderItem.findMany({ where: { orderId: id } });
    for (const item of items) {
      // Only decrements when enough is left, so a one-of-a-kind ring can't be sold twice.
      const { count: updated } = await tx.product.updateMany({
        where: { id: item.productId, stock: { gte: item.qty } },
        // Paying ends any reservation on the ring.
        data: { stock: { decrement: item.qty }, reservedUntil: null, reservedById: null },
      });
      if (updated === 0) throw new OutOfStockError(item.name);
    }
    return { status: 'paid' };
  });

  if (outcome.status === 'paid') {
    const paidOrder = await findOrder(id);
    // Awaited: on serverless, work left running after the response can be cut off.
    if (paidOrder) await Promise.all([sendPurchaseReceipt({ order: paidOrder, locale }), alertOwnerOfOrder(paidOrder)]);
  }
  return outcome;
}

// Cash-on-delivery orders are never paid online, so the shop hears about them when they're placed.
export async function alertShopOfUnpaidOrder(orderId: string) {
  const order = await findOrder(orderId);
  if (order) await alertOwnerOfOrder(order);
}
