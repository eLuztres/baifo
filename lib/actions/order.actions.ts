'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { Prisma } from '@prisma/client';
import { isRedirectError } from 'next/dist/client/components/redirect-error';
import { prisma } from '@/db/prisma';
import { getMyCart } from '@/lib/actions/cart.actions';
import { getUserById } from '@/lib/actions/user.actions';
import { getSession, getSessionUserId, isAdmin } from '@/lib/auth-guard';
import { PAGE_SIZE, PAYMENT_METHODS, SHOWCASE_MODE } from '@/lib/constants';
import { getT } from '@/lib/i18n-server';
import { isReservedByOther } from '@/lib/reservation';
import type { TranslationKey, Translator } from '@/lib/i18n';
import {
  OutOfStockError,
  alertShopOfUnpaidOrder,
  findItemOutOfStock,
  findOrder,
  findShortItem,
  updateOrderToPaid,
} from '@/lib/order-payment';
import { paypal } from '@/lib/paypal';
import { formatError, round2 } from '@/lib/utils';
import { allowedPaymentMethodSchema, idSchema, insertOrderSchema } from '@/lib/validators';
import { CartItem, Order, PaymentResult } from '@/types';

interface ActionResult {
  success: boolean;
  message: string;
}

interface CheckoutResult extends ActionResult {
  /** Where the buyer continues: the new order, or the checkout step to fix. */
  redirectTo?: string;
}

interface PayPalOrderResult extends ActionResult {
  data?: string;
}

type OrderAttempt = { orderId: string } | { refusal: CheckoutResult };

type PayableOrder = { order: Order; error?: undefined } | { order?: undefined; error: string };

const ADMIN_ONLY: ActionResult = { success: false, message: 'ERROR_ADMIN_ONLY' satisfies TranslationKey };

// PayPal order ids are short uppercase codes, not uuids.
const paypalApprovalSchema = z.object({ orderID: z.string().trim().min(1).max(64) });

/** Same products in the same quantities; prices aren't compared, getMyCart already reprices them. */
function hasSameItems(lockedItems: CartItem[], items: CartItem[]) {
  return (
    lockedItems.length === items.length &&
    lockedItems.every((item, index) => item.productId === items[index].productId && item.qty === items[index].qty)
  );
}

function paymentErrorMessage(error: unknown, t: Translator) {
  return error instanceof OutOfStockError
    ? t('ORDER_STOCK_CONFLICT', { name: error.productName })
    : formatError(error);
}

// Create order and create the order items
export async function createOrder(): Promise<CheckoutResult> {
  try {
    const [{ t }, userId] = await Promise.all([getT(), getSessionUserId()]);
    if (SHOWCASE_MODE) return { success: false, message: t('SHOWCASE_NO_SALES'), redirectTo: '/' };
    if (!userId) return { success: false, message: t('AUTH_SIGN_IN_AGAIN'), redirectTo: '/sign-in' };

    const [cart, user] = await Promise.all([getMyCart(), getUserById(userId)]);
    if (!user) return { success: false, message: t('AUTH_SIGN_IN_AGAIN'), redirectTo: '/sign-in' };
    if (!cart || cart.items.length === 0) {
      return { success: false, message: t('CART_EMPTY_TITLE'), redirectTo: '/cart' };
    }
    if (!user.address) {
      return { success: false, message: t('CHECKOUT_ADDRESS_MISSING'), redirectTo: '/shipping-address' };
    }
    // The shared schema only checks the shape; the configured list is server-side.
    if (!user.paymentMethod || !allowedPaymentMethodSchema(PAYMENT_METHODS).safeParse(user.paymentMethod).success) {
      return { success: false, message: t('VALIDATION_PAYMENT_METHOD_INVALID'), redirectTo: '/payment-method' };
    }

    const order = insertOrderSchema.parse({
      userId: user.id,
      shippingAddress: user.address,
      paymentMethod: user.paymentMethod,
      itemsPrice: cart.itemsPrice,
      shippingPrice: cart.shippingPrice,
      taxPrice: cart.taxPrice,
      totalPrice: cart.totalPrice,
    });

    const attempt = await prisma.$transaction(async (tx): Promise<OrderAttempt> => {
      // Locks the cart row: a second submit (double tap, another tab) waits here and then
      // finds the cart already emptied, instead of ordering the same items again.
      await tx.$queryRaw`SELECT "id" FROM "Cart" WHERE "id" = ${cart.id}::uuid FOR UPDATE`;
      const lockedCart = await tx.cart.findUnique({ where: { id: cart.id }, select: { items: true } });
      if (!lockedCart || lockedCart.items.length === 0) {
        return { refusal: { success: false, message: t('CART_EMPTY_TITLE'), redirectTo: '/cart' } };
      }
      // The order is built from the cart read before the lock; emptying the cart below must not drop
      // an item another tab added meanwhile, so the buyer checks the order again instead.
      if (!hasSameItems(lockedCart.items as CartItem[], cart.items)) {
        return { refusal: { success: false, message: t('CHECKOUT_CART_CHANGED'), redirectTo: '/place-order' } };
      }

      const products = await tx.product.findMany({
        where: { id: { in: cart.items.map((item) => item.productId) } },
        select: { id: true, stock: true, reservedUntil: true, reservedById: true },
      });

      const shortItem = findShortItem(cart.items, products);
      if (shortItem) {
        return {
          refusal: { success: false, message: t('CHECKOUT_NOT_ENOUGH_STOCK', { name: shortItem.name }), redirectTo: '/cart' },
        };
      }

      // A ring another customer has reserved can't be ordered until the reservation ends.
      // Guest reservations have no owner, so they block every account.
      const reservedIds = new Set(
        products.filter((product) => isReservedByOther(product, userId)).map((product) => product.id)
      );
      const reservedItem = cart.items.find((item) => reservedIds.has(item.productId));
      if (reservedItem) {
        return { refusal: { success: false, message: t('RESERVE_BLOCKED_ORDER', { name: reservedItem.name }) } };
      }

      await tx.cart.update({
        where: { id: cart.id },
        data: { items: [], totalPrice: 0, taxPrice: 0, shippingPrice: 0, itemsPrice: 0 },
      });

      const insertedOrder = await tx.order.create({ data: order });
      await tx.orderItem.createMany({
        data: cart.items.map((item) => ({
          orderId: insertedOrder.id,
          productId: item.productId,
          name: item.name,
          slug: item.slug,
          image: item.image,
          qty: item.qty,
          price: item.price,
        })),
      });

      return { orderId: insertedOrder.id };
    });
    if ('refusal' in attempt) return attempt.refusal;

    // The order stands even if the alert fails; it's logged instead.
    if (order.paymentMethod === 'CashOnDelivery') {
      await alertShopOfUnpaidOrder(attempt.orderId).catch((error) => console.error('[email] Order alert failed', error));
    }

    return { success: true, message: t('CHECKOUT_ORDER_PLACED'), redirectTo: `/order/${attempt.orderId}` };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return { success: false, message: formatError(error) };
  }
}

/** The order for its buyer or an admin; null for anyone else, so a page can't reveal that it exists. */
export async function getOrderById(orderId: string): Promise<Order | null> {
  const id = idSchema.safeParse(orderId);
  if (!id.success) return null;

  const [session, order] = await Promise.all([getSession(), findOrder(id.data)]);
  if (!order || !session?.user?.id) return null;

  const isAllowed = order.userId === session.user.id || session.user.role === 'admin';
  return isAllowed ? order : null;
}

/** The buyer's own unpaid PayPal order, or the message to show instead. */
async function findPayablePayPalOrder(orderId: string, t: Translator): Promise<PayableOrder> {
  const userId = await getSessionUserId();
  if (!userId) return { error: t('AUTH_SIGN_IN_AGAIN') };

  const id = idSchema.safeParse(orderId);
  const order = id.success ? await findOrder(id.data) : null;
  if (!order || order.userId !== userId) return { error: t('ERROR_NOT_FOUND') };
  if (order.isPaid) return { error: t('ORDER_ALREADY_PAID') };
  if (order.paymentMethod !== 'PayPal') return { error: t('VALIDATION_PAYMENT_METHOD_INVALID') };

  const soldOutItem = await findItemOutOfStock(order.orderitems);
  if (soldOutItem) return { error: t('ORDER_SOLD_OUT', { name: soldOutItem.name }) };

  return { order };
}

// Create new paypal order
export async function createPayPalOrder(orderId: string): Promise<PayPalOrderResult> {
  try {
    const { t } = await getT();
    const { order, error } = await findPayablePayPalOrder(orderId, t);
    if (!order) return { success: false, message: error };

    const paypalOrder = await paypal.createOrder(round2(order.totalPrice).toFixed(2));

    // Conditional, so a late click can't overwrite the payment of an order that was just paid.
    await prisma.order.updateMany({
      where: { id: order.id, isPaid: false },
      data: {
        paymentResult: { id: paypalOrder.id, email_address: '', status: '', pricePaid: '0.00' } satisfies PaymentResult,
      },
    });

    return { success: true, message: '', data: paypalOrder.id };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// Approve paypal order and update order to paid
export async function approvePayPalOrder(orderId: string, data: { orderID: string }): Promise<ActionResult> {
  try {
    const { t, locale } = await getT();
    const { order, error } = await findPayablePayPalOrder(orderId, t);
    if (!order) return { success: false, message: error };

    // Checked before capturing: a stale tab must not take money for a PayPal order we didn't create last.
    const approval = paypalApprovalSchema.safeParse(data);
    const orderID = approval.success ? approval.data.orderID : undefined;
    if (!orderID || orderID !== order.paymentResult?.id) return { success: false, message: t('ORDER_PAYPAL_FAILED') };

    const captureData = await paypal.capturePayment(orderID);
    if (captureData.id !== orderID || captureData.status !== 'COMPLETED') {
      return { success: false, message: t('ORDER_PAYPAL_FAILED') };
    }

    try {
      await updateOrderToPaid({
        orderId: order.id,
        paymentResult: {
          id: captureData.id,
          status: captureData.status,
          email_address: captureData.payer?.email_address ?? '',
          pricePaid:
            captureData.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value ??
            round2(order.totalPrice).toFixed(2),
        },
        locale,
      });
    } catch (paidError) {
      console.error(`[paypal] Order ${order.id} was captured (${orderID}) but not marked as paid`, paidError);
      return { success: false, message: paymentErrorMessage(paidError, t) };
    }

    revalidatePath(`/order/${order.id}`);
    return { success: true, message: t('ORDER_PAID_THANKS') };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// Get user's orders
export async function getMyOrders({
  limit = PAGE_SIZE,
  page,
}: {
  limit?: number;
  page: number;
}) {
  const userId = await getSessionUserId();
  if (!userId) throw new Error('AUTH_SIGN_IN_AGAIN' satisfies TranslationKey);

  const where: Prisma.OrderWhereInput = { userId };
  const [data, dataCount] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: (page - 1) * limit,
    }),
    prisma.order.count({ where }),
  ]);

  return {
    data,
    totalPages: Math.ceil(dataCount / limit),
  };
}

type SalesDataType = {
  month: string;
  totalSales: number;
}[];

// Get sales data and order summary
export async function getOrderSummary() {
  if (!(await isAdmin())) throw new Error('ERROR_ADMIN_ONLY' satisfies TranslationKey);

  // Revenue counts paid orders only: cash on delivery and abandoned online payments stay unpaid.
  const [ordersCount, productsCount, usersCount, totalSales, salesDataRaw, latestSales] = await Promise.all([
    prisma.order.count(),
    prisma.product.count(),
    prisma.user.count(),
    prisma.order.aggregate({ where: { isPaid: true }, _sum: { totalPrice: true } }),
    prisma.$queryRaw<Array<{ month: string; totalSales: Prisma.Decimal }>>`
      SELECT to_char(date_trunc('month', "createdAt"), 'MM/YY') AS "month", sum("totalPrice") AS "totalSales"
      FROM "Order"
      WHERE "isPaid" = true
      GROUP BY date_trunc('month', "createdAt")
      ORDER BY date_trunc('month', "createdAt")`,
    prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true } } },
      take: 6,
    }),
  ]);

  const salesData: SalesDataType = salesDataRaw.map((entry) => ({
    month: entry.month,
    totalSales: Number(entry.totalSales),
  }));

  return {
    ordersCount,
    productsCount,
    usersCount,
    totalSales,
    latestSales,
    salesData,
  };
}

// Get all orders
export async function getAllOrders({
  limit = PAGE_SIZE,
  page,
  query,
}: {
  limit?: number;
  page: number;
  query: string;
}) {
  if (!(await isAdmin())) throw new Error('ERROR_ADMIN_ONLY' satisfies TranslationKey);
  const where: Prisma.OrderWhereInput =
    query && query !== 'all'
      ? { user: { name: { contains: query, mode: 'insensitive' } } }
      : {};

  const [data, dataCount] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: (page - 1) * limit,
      include: { user: { select: { name: true } } },
    }),
    prisma.order.count({ where }),
  ]);

  return {
    data,
    totalPages: Math.ceil(dataCount / limit),
  };
}

// Delete an order
export async function deleteOrder(id: string): Promise<ActionResult> {
  try {
    if (!(await isAdmin())) return ADMIN_ONLY;

    await prisma.order.delete({ where: { id: idSchema.parse(id) } });
    revalidatePath('/admin/orders');

    const { t } = await getT();
    return { success: true, message: t('ORDER_DELETED') };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// Update COD order to paid
export async function updateOrderToPaidCOD(orderId: string): Promise<ActionResult> {
  try {
    if (!(await isAdmin())) return ADMIN_ONLY;

    const { t } = await getT();
    try {
      const outcome = await updateOrderToPaid({ orderId });
      if (outcome.status === 'already-paid') return { success: false, message: t('ORDER_ALREADY_PAID') };
    } catch (error) {
      return { success: false, message: paymentErrorMessage(error, t) };
    }

    revalidatePath(`/order/${orderId}`);
    return { success: true, message: t('ORDER_MARKED_PAID') };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// Update COD order to delivered
export async function deliverOrder(orderId: string): Promise<ActionResult> {
  try {
    if (!(await isAdmin())) return ADMIN_ONLY;

    const { t } = await getT();
    const id = idSchema.parse(orderId);
    const order = await prisma.order.findUnique({ where: { id }, select: { isPaid: true } });

    if (!order) return { success: false, message: t('ERROR_NOT_FOUND') };
    if (!order.isPaid) return { success: false, message: t('ORDER_NOT_PAID_YET') };

    await prisma.order.update({
      where: { id },
      data: { isDelivered: true, deliveredAt: new Date() },
    });
    revalidatePath(`/order/${id}`);

    return { success: true, message: t('ORDER_MARKED_DELIVERED') };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}
