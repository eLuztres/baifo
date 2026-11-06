import { z } from 'zod';
import { insertReviewSchema } from '@/lib/validators';

export interface Product {
  name: string;
  shortName?: string | null;
  slug: string;
  brand: string;
  description: string;
  stock: number;
  images: string[];
  isFeatured: boolean;
  banner: string | null;
  price: string;
  priceClass?: string | null;
  sourceImage?: string | null;
  id: string;
  rating: string;
  numReviews: number;
  createdAt: Date;
  imageIndex : number;
  reservedUntil?: Date | string | null;
  reservedById?: string | null;
}

export type Review = z.infer<typeof insertReviewSchema> & {
  id: string;
  createdAt: Date;
  user?: { name: string };
};
