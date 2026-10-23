import { cache } from 'react';
import { prisma } from '@/db/prisma';

// Here, not in cart.actions.ts: a 'use server' file may only export async functions.
/** The visitor's cart as stored; one query per render, shared by the header bag and the cart pages. */
export const findCartRow = cache(async (sessionCartId?: string, userId?: string) => {
  // Without both ids, Prisma would drop the filter and return someone else's cart.
  if (!userId && !sessionCartId) return null;

  return prisma.cart.findFirst({
    where: userId ? { userId } : { sessionCartId },
  });
});
