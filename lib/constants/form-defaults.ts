// Client-safe: forms import these without pulling in index.ts and its server-only brand config.
import type { z } from 'zod';
import type {
  insertReviewSchema,
  signInFormSchema,
} from '@/lib/validators';

export const signInDefaultValues = {
  email: '',
  password: '',
} satisfies z.input<typeof signInFormSchema>;

export const reviewFormDefaultValues = {
  title: '',
  description: '',
  rating: 0,
} satisfies Partial<z.input<typeof insertReviewSchema>>;
