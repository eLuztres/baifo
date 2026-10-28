'use server';

import { z } from 'zod';
import { idSchema, insertReviewSchema } from '@/lib/validators';
import { formatError } from '@/lib/utils';
import { prisma } from '@/db/prisma';
import { revalidatePath } from 'next/cache';
import { getSessionUserId } from '@/lib/auth-guard';
import type { TranslationKey } from '@/lib/i18n-core';

// Create & Update Reviews
export async function createUpdateReview(
  data: z.infer<typeof insertReviewSchema>
) {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return { success: false, message: 'AUTH_SIGN_IN_AGAIN' satisfies TranslationKey };
    }

    // Validate and store the review
    const review = insertReviewSchema.parse({ ...data, userId });

    const [product, reviewExists] = await Promise.all([
      prisma.product.findUnique({
        where: { id: review.productId },
        select: { slug: true },
      }),
      prisma.review.findFirst({
        where: { productId: review.productId, userId },
        select: { id: true },
      }),
    ]);

    if (!product) {
      return { success: false, message: 'ERROR_NOT_FOUND' satisfies TranslationKey };
    }

    await prisma.$transaction(async (tx) => {
      if (reviewExists) {
        // Update review
        await tx.review.update({
          where: { id: reviewExists.id },
          data: {
            title: review.title,
            description: review.description,
            rating: review.rating,
          },
        });
      } else {
        // Create review
        await tx.review.create({ data: review });
      }

      // Get avg rating
      const averageRating = await tx.review.aggregate({
        _avg: { rating: true },
        where: { productId: review.productId },
      });

      // Get number of reviews
      const numReviews = await tx.review.count({
        where: { productId: review.productId },
      });

      // Update the rating and numReviews in product table
      await tx.product.update({
        where: { id: review.productId },
        data: {
          rating: averageRating._avg.rating ?? 0,
          numReviews,
        },
      });
    });

    revalidatePath(`/product/${product.slug}`);

    return { success: true, message: 'REVIEW_SAVED' satisfies TranslationKey };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}


// Get all reviews for a product
export async function getReviews({ productId }: { productId: string }) {
  // Public: an object instead of an id would be read by Prisma as a filter.
  if (!idSchema.safeParse(productId).success) return { data: [] };
  const data = await prisma.review.findMany({
    where: {
      productId: productId,
    },
    include: {
      user: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return { data };
}

// Get a review written by the current user (null for guests)
export async function getReviewByProductId({
  productId,
}: {
  productId: string;
}) {
  const userId = await getSessionUserId();
  if (!userId || !idSchema.safeParse(productId).success) return null;

  return await prisma.review.findFirst({
    where: { productId, userId },
  });
}
