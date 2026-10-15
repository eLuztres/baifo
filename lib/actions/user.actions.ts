'use server';

import {
  shippingAddressSchema,
  signInFormSchema,
  signUpFormSchema,
  paymentMethodSchema,
  updateUserSchema,
} from '../validators';
import { auth, authServer } from '@/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { isRedirectError } from 'next/dist/client/components/redirect-error';
import { prisma } from '@/db/prisma';
import { formatError } from '../utils';
import { ShippingAddress } from '@/types';
import { z } from 'zod';
import { PAGE_SIZE } from '../constants';
import { revalidatePath } from 'next/cache';
import { Prisma } from '@prisma/client';
import { getMyCart } from './cart.actions';
import { isAdmin } from '@/lib/auth-guard';

// Only same-site paths are allowed as the target after signing in.
function safeCallbackUrl(formData: FormData) {
  const callbackUrl = (formData.get('callbackUrl') as string) || '/';
  return callbackUrl.startsWith('/') && !callbackUrl.startsWith('//') ? callbackUrl : '/';
}

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
    redirect(safeCallbackUrl(formData));
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    return { success: false, message: 'Invalid email or password' };
  }
}

// Sign in (or sign up) with Google, then return to where the user came from
export async function signInWithGoogle(formData: FormData) {
  const redirectTo = safeCallbackUrl(formData);
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
    // get current users cart and delete it so it does not persist to next user
  const currentCart = await getMyCart();

  if (currentCart?.id) {
    await prisma.cart.delete({ where: { id: currentCart.id } });
  } else {
    console.warn('No cart found for deletion.');
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

    // Creates the user and signs them in; the welcome email is sent from the user-create hook in auth.ts.
    await authServer.api.signUpEmail({
      body: { name: user.name, email: user.email, password: user.password },
      headers: await headers(),
    });
    redirect(safeCallbackUrl(formData));
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    return { success: false, message: formatError(error) };
  }
}

// Get user by the ID
export async function getUserById(userId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId },
  });
  if (!user) throw new Error('User not found');
  return user;
}

// Update the user's address
export async function updateUserAddress(data: ShippingAddress) {
  try {
    const session = await auth();

    const currentUser = await prisma.user.findFirst({
      where: { id: session?.user?.id },
    });

    if (!currentUser) {
      return { success: false, message: 'User not found' };
    }

    const address = shippingAddressSchema.parse(data);

    await prisma.user.update({
      where: { id: currentUser.id },
      data: { address },
    });

    return {
      success: true,
      message: 'User updated successfully',
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// Update user's payment method
export async function updateUserPaymentMethod(
  data: z.infer<typeof paymentMethodSchema>
) {
  try {
    const session = await auth();
    const currentUser = await prisma.user.findFirst({
      where: { id: session?.user?.id },
    });

    if (!currentUser) {
      return { success: false, message: 'User not found' };
    }

    const paymentMethod = paymentMethodSchema.parse(data);

    await prisma.user.update({
      where: { id: currentUser.id },
      data: { paymentMethod: paymentMethod.type },
    });

    return {
      success: true,
      message: 'User updated successfully',
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// Update the user profile
export async function updateProfile(user: { name: string; email: string }) {
  try {
    const session = await auth();

    const currentUser = await prisma.user.findFirst({
      where: {
        id: session?.user?.id,
      },
    });

    if (!currentUser) {
      return { success: false, message: 'User not found' };
    }

    // Through Better Auth so the cached session (and the header) picks up the new name at once.
    await authServer.api.updateUser({ body: { name: user.name }, headers: await headers() });

    return {
      success: true,
      message: 'User updated successfully',
    };
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
  if (!(await isAdmin())) throw new Error('Only admins can do this');
  const queryFilter: Prisma.UserWhereInput =
    query && query !== 'all'
      ? {
          name: {
            contains: query,
            mode: 'insensitive',
          } as Prisma.StringFilter,
        }
      : {};

  const data = await prisma.user.findMany({
    where: {
      ...queryFilter,
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: (page - 1) * limit,
  });

  const dataCount = await prisma.user.count();

  return {
    data,
    totalPages: Math.ceil(dataCount / limit),
  };
}

// Delete a user
export async function deleteUser(id: string) {
  try {
    // Server actions can be called directly, so check the caller here too
    const session = await auth();
    if (session?.user?.role !== 'admin') {
      return { success: false, message: 'Only admins can delete users' };
    }
    if (session.user.id === id) {
      return {
        success: false,
        message: 'You cannot delete the account you are signed in with',
      };
    }

    const exists = await prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!exists) {
      revalidatePath('/admin/users');
      return { success: false, message: 'User not found. It may already have been deleted.' };
    }

    // The database cascades this to the user's linked Google accounts,
    // sessions, carts, orders and reviews.
    await prisma.user.delete({ where: { id } });

    revalidatePath('/admin/users');

    return {
      success: true,
      message: 'User deleted successfully',
    };
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
    if (!(await isAdmin())) {
      return { success: false, message: 'Only admins can do this' };
    }
    await prisma.user.update({
      where: { id: user.id },
      data: {
        name: user.name,
        role: user.role,
      },
    });

    revalidatePath('/admin/users');

    return {
      success: true,
      message: 'User updated successfully',
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}
