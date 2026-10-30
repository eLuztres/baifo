import {
  allowedPaymentMethodSchema,
  cartItemSchema,
  insertReviewSchema,
  sellerLocaleSchema,
  sellerNameSchema,
  sellerPhoneSchema,
  shippingAddressSchema,
  signInFormSchema,
  signUpFormSchema,
} from '@/lib/validators';
import { DEFAULT_PAYMENT_METHOD, PAYMENT_METHODS } from '@/lib/constants';

describe('cartItemSchema', () => {
  const item = {
    productId: 'p1',
    name: 'Lamp',
    slug: 'lamp',
    qty: 1,
    image: '/lamp.jpg',
    price: '120.50',
  };

  it('accepts a valid item', () => {
    expect(cartItemSchema.safeParse(item).success).toBe(true);
  });

  it.each([
    ['a negative quantity', { qty: -1 }],
    ['a fractional quantity', { qty: 1.5 }],
    ['a non-numeric price', { price: 'free' }],
    ['a missing image', { image: '' }],
  ])('rejects %s', (_, override) => {
    expect(cartItemSchema.safeParse({ ...item, ...override }).success).toBe(false);
  });
});

describe('signUpFormSchema', () => {
  const user = { name: 'Ana', email: 'ana@example.com', password: 'long-secret1', confirmPassword: 'long-secret1' };

  it('accepts matching passwords', () => {
    expect(signUpFormSchema.safeParse(user).success).toBe(true);
  });

  it('reports mismatched passwords on confirmPassword', () => {
    const result = signUpFormSchema.safeParse({ ...user, confirmPassword: 'other-secret12' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]).toMatchObject({
      path: ['confirmPassword'],
      message: 'VALIDATION_PASSWORDS_MISMATCH',
    });
  });

  it('rejects an invalid email', () => {
    expect(signUpFormSchema.safeParse({ ...user, email: 'nope' }).success).toBe(false);
  });

  it('asks new passwords for at least 10 characters', () => {
    const result = signUpFormSchema.safeParse({ ...user, password: 'secret123', confirmPassword: 'secret123' });
    expect(result.error?.issues[0]).toMatchObject({ path: ['password'], message: 'VALIDATION_PASSWORD_MIN' });
  });

  it('trims spaces around a pasted email', () => {
    const result = signUpFormSchema.safeParse({ ...user, email: ' ana@example.com ' });
    expect(result.data?.email).toBe('ana@example.com');
  });
});

describe('signInFormSchema', () => {
  it('trims spaces around a pasted email', () => {
    const result = signInFormSchema.safeParse({ email: ' ana@example.com', password: 'secret1' });
    expect(result.data?.email).toBe('ana@example.com');
  });
});

describe('allowedPaymentMethodSchema', () => {
  it.each(PAYMENT_METHODS)('accepts the configured method %s', (type) => {
    expect(allowedPaymentMethodSchema(PAYMENT_METHODS).safeParse(type).success).toBe(true);
  });

  it('rejects an unknown method', () => {
    const result = allowedPaymentMethodSchema(PAYMENT_METHODS).safeParse('NotARealMethod');
    expect(result.error?.issues[0].message).toBe('VALIDATION_PAYMENT_METHOD_INVALID');
  });

  // A typo here (e.g. "Paypal") leaves nothing preselected and fails checkout validation
  it('has a default payment method that is one of the configured methods', () => {
    expect(PAYMENT_METHODS).toContain(DEFAULT_PAYMENT_METHOD);
  });
});

describe('shippingAddressSchema', () => {
  it('requires every field to have at least 3 characters', () => {
    const result = shippingAddressSchema.safeParse({
      fullName: 'Al',
      streetAddress: 'x',
      city: 'y',
      postalCode: '1',
      country: 'z',
    });
    expect(result.error?.issues).toHaveLength(5);
  });
});

describe('insertReviewSchema', () => {
  const review = { title: 'Great', description: 'Lovely lamp', productId: 'p1', userId: 'u1', rating: '5' };

  it('coerces the rating to a number', () => {
    expect(insertReviewSchema.parse(review).rating).toBe(5);
  });

  it.each([0, 6, 3.5])('rejects a rating of %p', (rating) => {
    expect(insertReviewSchema.safeParse({ ...review, rating }).success).toBe(false);
  });
});

describe('sellerNameSchema', () => {
  it('takes a trimmed nickname, and empty as no name', () => {
    expect(sellerNameSchema.parse('  Lula  ')).toBe('Lula');
    expect(sellerNameSchema.parse('Pepe 1990')).toBe('Pepe 1990');
    expect(sellerNameSchema.parse('')).toBeNull();
  });

  it('refuses links, phone numbers and long names', () => {
    for (const name of ['www.lula.es', 'lula.com', 'https://x.y', 'lula@mail', '612 345 678', '+34612345678', 'L'.repeat(31)]) {
      expect(sellerNameSchema.safeParse(name).success).toBe(false);
    }
  });
});

describe('sellerPhoneSchema', () => {
  it('keeps only the digits, with 00 read as +, and empty as no number', () => {
    expect(sellerPhoneSchema.parse('+34 612 34 56 78')).toBe('34612345678');
    expect(sellerPhoneSchema.parse('0034 612-345-678')).toBe('34612345678');
    expect(sellerPhoneSchema.parse('612345678')).toBe('612345678');
    expect(sellerPhoneSchema.parse('')).toBe('');
  });

  it('refuses numbers that are too short or too long', () => {
    for (const phone of ['1234', '61234567', '1'.repeat(16)]) {
      expect(sellerPhoneSchema.safeParse(phone).success).toBe(false);
    }
  });
});

describe('sellerLocaleSchema', () => {
  it('takes a shop language, and empty as none', () => {
    expect(sellerLocaleSchema.parse('de')).toBe('de');
    expect(sellerLocaleSchema.parse('')).toBeNull();
    expect(sellerLocaleSchema.safeParse('xx').success).toBe(false);
  });
});
