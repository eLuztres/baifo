'use server';

import {
  allowedPaymentMethodSchema,
  idSchema,
  shippingAddressSchema,
  signInFormSchema,
  signUpFormSchema,
  paymentMethodSchema,
  updateProfileSchema,
  updateUserSchema,
  userRoleSchema,
} from '@/lib/validators';
import { authServer } from '@/auth';
import { isRedirectError } from 'next/dist/client/components/redirect-error';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
import { formatError } from '@/lib/utils';
import { ShippingAddress } from '@/types';
import { z } from 'zod';
import { GOOGLE_AUTH_ENABLED, PAGE_SIZE, PAYMENT_METHODS, USER_ROLES } from '@/lib/constants';
import { revalidatePath } from 'next/cache';
import { Prisma } from '@prisma/client';
import { getMyCart } from './cart.actions';
import type { TranslationKey } from '@/lib/i18n-core';
import { getSession, getSessionUserId, isAdmin } from '@/lib/auth-guard';
import { headers } from 'next/headers';
import { safeCallbackUrl } from '@/lib/safe-callback-url';

// Without a target, the sign-in page sends signed-in visitors on to their home (admins to ADMIN_HOME_PATH).
const AFTER_SIGN_IN = '/sign-in';

// Sign in the user with credentials
export async function signInWithCredentials(
  prevState: unknown,
  formData: FormData
) {
  try {
    const user = signInFormSchema.parse({
      email: formData.get('email'),
      password: formData.get('password'),
    });
    await authServer.api.signInEmail({ body: user, headers: await headers() });
    redirect(safeCallbackUrl(formData.get('callbackUrl'), AFTER_SIGN_IN));
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    const email = signInFormSchema.shape.email.safeParse(formData.get('email'));
    if (email.success && (await isGoogleOnlyAccount(email.data))) {
      return { success: false, message: 'AUTH_USE_GOOGLE' satisfies TranslationKey };
    }
    return { success: false, message: 'AUTH_INVALID_CREDENTIALS' satisfies TranslationKey };
  }
}

// Linking Google drops an unverified password login (claimUnverifiedUser in auth.ts), and there is no
// password reset, so these customers are told how to get in instead of "invalid password".
async function isGoogleOnlyAccount(email: string) {
  if (!GOOGLE_AUTH_ENABLED) return false;
  const user = await prisma.user
    .findFirst({
      where: {
        email: { equals: email, mode: 'insensitive' },
        account: { some: { providerId: 'google' }, none: { providerId: 'credential' } },
      },
      select: { id: true },
    })
    .catch(() => null);
  return Boolean(user);
}

// Sign in (or sign up) with Google, then return to where the user came from
export async function signInWithGoogle(formData: FormData) {
  const redirectTo = safeCallbackUrl(formData.get('callbackUrl'), AFTER_SIGN_IN);
  const { url } = await authServer.api.signInSocial({
    body: {
      provider: 'google',
      callbackURL: redirectTo,
      errorCallbackURL: `/sign-in?callbackUrl=${encodeURIComponent(redirectTo)}`,
    },
    headers: await headers(),
  });
  if (url) redirect(url);
}

// Sign user out
export async function signOutUser() {
  // Delete the cart so it does not carry over to the next person on this device
  const currentCart = await getMyCart();

  if (currentCart?.id) {
    await prisma.cart.delete({ where: { id: currentCart.id } });
  }
  await authServer.api.signOut({ headers: await headers() });
  redirect('/');
}

// Sign up user
export async function signUpUser(prevState: unknown, formData: FormData) {
  try {
    const user = signUpFormSchema.parse({
      name: formData.get('name'),
      email: formData.get('email'),
      password: formData.get('password'),
      confirmPassword: formData.get('confirmPassword'),
    });

    // Older accounts may have a mixed-case email, which the case-sensitive unique index lets through.
    const existingUser = await prisma.user.findFirst({
      where: { email: { equals: user.email, mode: 'insensitive' } },
      select: { id: true },
    });
    if (existingUser) {
      return { success: false, message: 'ERROR_EMAIL_EXISTS' satisfies TranslationKey };
    }

    // Creates the user and signs them in; the welcome email is sent from the user-create hook in auth.ts.
    await authServer.api.signUpEmail({
      body: { name: user.name, email: user.email, password: user.password },
      headers: await headers(),
    });
    redirect(safeCallbackUrl(formData.get('callbackUrl'), AFTER_SIGN_IN));
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    return { success: false, message: formatError(error) };
  }
}

// What pages and order code may read about an account (never the password hash).
const ACCOUNT_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  address: true,
  paymentMethod: true,
} satisfies Prisma.UserSelect;

/** The account of the signed-in user, or any account for an admin; null otherwise or when it doesn't exist. */
export async function getUserById(userId: string) {
  const session = await getSession();
  const callerId = session?.user?.id;
  const isAllowed = callerId === userId || session?.user?.role === 'admin';
  if (!callerId || !isAllowed || !idSchema.safeParse(userId).success) return null;

  return prisma.user.findUnique({ where: { id: userId }, select: ACCOUNT_SELECT });
}

// Update the user's address
export async function updateUserAddress(data: ShippingAddress) {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return { success: false, message: 'AUTH_SIGN_IN_AGAIN' satisfies TranslationKey };
    }

    const address = shippingAddressSchema.parse(data);

    await prisma.user.update({
      where: { id: userId },
      data: { address },
    });

    return { success: true, message: 'ACCOUNT_SAVED' satisfies TranslationKey };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// Update user's payment method
export async function updateUserPaymentMethod(
  data: z.infer<typeof paymentMethodSchema>
) {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return { success: false, message: 'AUTH_SIGN_IN_AGAIN' satisfies TranslationKey };
    }

    const { type } = paymentMethodSchema.parse(data);
    allowedPaymentMethodSchema(PAYMENT_METHODS).parse(type);

    await prisma.user.update({
      where: { id: userId },
      data: { paymentMethod: type },
    });

    return { success: true, message: 'ACCOUNT_SAVED' satisfies TranslationKey };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// Update the user profile (only the name: the email is the login)
export async function updateProfile(user: z.infer<typeof updateProfileSchema>) {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return { success: false, message: 'AUTH_SIGN_IN_AGAIN' satisfies TranslationKey };
    }

    const { name } = updateProfileSchema.pick({ name: true }).parse(user);

    // Through Better Auth so the session (and the header) picks up the new name at once.
    await authServer.api.updateUser({ body: { name }, headers: await headers() });

    return { success: true, message: 'ACCOUNT_SAVED' satisfies TranslationKey };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// Get all the users
export async function getAllUsers({
  limit = PAGE_SIZE,
  page,
  query,
}: {
  limit?: number;
  page: number;
  query: string;
}) {
  if (!(await isAdmin())) throw new Error('ERROR_ADMIN_ONLY' satisfies TranslationKey);
  const where: Prisma.UserWhereInput =
    query && query !== 'all'
      ? { name: { contains: query, mode: 'insensitive' } }
      : {};

  const [data, dataCount] = await Promise.all([
    prisma.user.findMany({
      where,
      select: { id: true, name: true, email: true, role: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: (page - 1) * limit,
    }),
    prisma.user.count({ where }),
  ]);

  return {
    data,
    totalPages: Math.ceil(dataCount / limit),
  };
}

// Delete a user
export async function deleteUser(id: string) {
  try {
    // Server actions can be called directly, so check the caller here too
    const session = await getSession();
    if (session?.user?.role !== 'admin') {
      return { success: false, message: 'ERROR_ADMIN_ONLY' satisfies TranslationKey };
    }
    if (session.user.id === id) {
      return { success: false, message: 'ADMIN_USER_DELETE_SELF' satisfies TranslationKey };
    }

    const user = await prisma.user.findUnique({
      where: { id: idSchema.parse(id) },
      select: { _count: { select: { Order: true } } },
    });
    if (!user) {
      revalidatePath('/admin/users');
      return { success: false, message: 'ERROR_NOT_FOUND' satisfies TranslationKey };
    }
    // Deleting cascades to the user's orders, which the shop must keep for invoices and taxes.
    if (user._count.Order > 0) {
      return { success: false, message: 'ADMIN_USER_HAS_ORDERS' satisfies TranslationKey };
    }

    // The database cascades this to the user's linked Google accounts, sessions, carts and reviews.
    await prisma.user.delete({ where: { id } });

    revalidatePath('/admin/users');

    return { success: true, message: 'ADMIN_USER_DELETED' satisfies TranslationKey };
  } catch (error) {
    return {
      success: false,
      message: formatError(error),
    };
  }
}

// Update a user
export async function updateUser(user: z.infer<typeof updateUserSchema>) {
  try {
    const session = await getSession();
    if (session?.user?.role !== 'admin') {
      return { success: false, message: 'ERROR_ADMIN_ONLY' satisfies TranslationKey };
    }

    const { id, name, role } = updateUserSchema.parse(user);
    // USER_ROLES is server env, so the role is checked here and not in the schema the form shares.
    userRoleSchema(USER_ROLES).parse(role);
    // Keeps the shop from losing its last admin by accident.
    if (id === session.user.id && role !== 'admin') {
      return { success: false, message: 'ADMIN_USER_ROLE_SELF' satisfies TranslationKey };
    }

    await prisma.user.update({
      where: { id },
      data: { name, role },
    });

    revalidatePath('/admin/users');

    return { success: true, message: 'ADMIN_USER_UPDATED' satisfies TranslationKey };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}
