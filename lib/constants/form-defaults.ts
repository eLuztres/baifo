// Client-safe: forms import these without pulling in index.ts and its server-only brand config.
import type { z } from 'zod';
import type {
  insertProductSchema,
  insertReviewSchema,
  shippingAddressSchema,
  signInFormSchema,
} from '@/lib/validators';

export const signInDefaultValues = {
  email: '',
  password: '',
} satisfies z.input<typeof signInFormSchema>;

export const shippingAddressDefaultValues = {
  fullName: '',
  streetAddress: '',
  city: '',
  postalCode: '',
  country: '',
} satisfies z.input<typeof shippingAddressSchema>;

export const productDefaultValues = {
  name: '',
  slug: '',
  category: '',
  images: [],
  brand: '',
  description: '',
  price: '0',
  priceClass: null,
  stock: 0,
  isFeatured: false,
  banner: null,
  categoryIds: [],
} satisfies z.input<typeof insertProductSchema>;

export const reviewFormDefaultValues = {
  title: '',
  description: '',
  rating: 0,
} satisfies Partial<z.input<typeof insertReviewSchema>>;
