import { z } from 'zod';
import {
  insertProductSchema,
  insertReviewSchema

} from '@/lib/validators';


export type Product = z.infer<typeof insertProductSchema> & {
  id: string;
  rating: string;
  numReviews: number;
  createdAt: Date;
  imageIndex : number;
  reservedUntil?: Date | string | null;
  reservedById?: string | null;
};

export type Review = z.infer<typeof insertReviewSchema> & {
  id: string;
  createdAt: Date;
  user?: { name: string };
};
