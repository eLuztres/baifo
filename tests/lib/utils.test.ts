import { Prisma } from '@prisma/client';
import { z } from 'zod';
import {
  formatCurrency,
  formatError,
  formatId,
  formatNumberWithDecimal,
  round2,
} from '@/lib/utils';
import { CURRENCY, NUMBER_LOCALE } from '@/lib/constants/currency';

describe('round2', () => {
  it.each([
    [1.005, 1.01],
    [2.675, 2.68],
    [10, 10],
    ['3.14159', 3.14],
  ])('rounds %p to %p', (input, expected) => {
    expect(round2(input)).toBe(expected);
  });

  it('rejects other types', () => {
    expect(() => round2(null as unknown as number)).toThrow('Value is not a number or string');
  });
});

describe('formatNumberWithDecimal', () => {
  it.each([
    [10, '10.00'],
    [10.5, '10.50'],
    [10.25, '10.25'],
  ])('formats %p as %p', (input, expected) => {
    expect(formatNumberWithDecimal(input)).toBe(expected);
  });
});

describe('formatCurrency', () => {
  // The currency and number locale are per-shop config, so compare against Intl directly
  const format = (value: number) =>
    new Intl.NumberFormat(NUMBER_LOCALE, { style: 'currency', currency: CURRENCY }).format(value);

  it('formats numbers, numeric strings and Prisma Decimals the same way', () => {
    expect(formatCurrency(1234.5)).toBe(format(1234.5));
    expect(formatCurrency('1234.5')).toBe(format(1234.5));
    expect(formatCurrency(new Prisma.Decimal('1234.5'))).toBe(format(1234.5));
  });

  it('returns NaN for null', () => {
    expect(formatCurrency(null)).toBe('NaN');
  });
});

describe('formatId', () => {
  it('keeps only the last six characters', () => {
    expect(formatId('0123456789abcdef')).toBe('..abcdef');
  });
});

describe('formatError', () => {
  it('joins Zod field messages', () => {
    const result = z.object({ a: z.string().min(3, 'A too short'), b: z.number() }).safeParse({ a: 'x', b: 'y' });
    expect(formatError(result.error)).toBe('A too short. Expected number, received string');
  });

  it('turns a Prisma unique-constraint error into a friendly message', () => {
    const error = { name: 'PrismaClientKnownRequestError', code: 'P2002', meta: { target: ['email'] } };
    expect(formatError(error)).toBe('Email already exists');
  });

  it('falls back to the error message', () => {
    expect(formatError(new Error('Boom'))).toBe('Boom');
  });
});
