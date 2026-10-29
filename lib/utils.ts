import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import qs from 'query-string';
import { CURRENCY, NUMBER_LOCALE, SHOP_TIME_ZONE } from '@/lib/constants/currency';
import { MESSAGE_SEPARATOR, type TranslationKey, type Translator } from '@/lib/i18n-core';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Convert prisma object into a regular JS object
export function convertToPlainObject<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

// Format number with decimal places
export function formatNumberWithDecimal(num: number): string {
  const [int, decimal] = num.toString().split('.');
  return decimal ? `${int}.${decimal.padEnd(2, '0')}` : `${int}.00`;
}

interface ZodErrorShape {
  name: 'ZodError';
  issues: { message: string }[];
}

// By name, not instanceof ZodError: client components import this file, and importing zod here put it in every page's bundle.
const isZodError = (error: unknown): error is ZodErrorShape =>
  typeof error === 'object' && error !== null && (error as { name?: unknown }).name === 'ZodError';

interface PrismaError {
  name: string;
  code?: string;
  meta?: { target?: unknown };
}

const isPrismaError = (error: unknown): error is PrismaError =>
  typeof error === 'object' &&
  error !== null &&
  String((error as { name?: unknown }).name).startsWith('PrismaClient');

// The unique index name or field list, e.g. "user_email_idx" or ['email'].
function alreadyExistsMessage(target: unknown): TranslationKey {
  const fields = String(target ?? '');
  if (fields.includes('email')) return 'ERROR_EMAIL_EXISTS';
  if (fields.includes('slug')) return 'ERROR_SLUG_EXISTS';
  return 'ERROR_ALREADY_EXISTS';
}

/**
 * The message an action returns to the user: Zod messages (translation keys), known Prisma
 * cases, or the app's own `throw new Error('…')` text. Anything else is logged and stays private.
 * Translate the result with translateMessage (Toaster and FormMessage already do).
 */
export function formatError(error: unknown): string {
  if (isZodError(error)) {
    return error.issues.map((issue) => issue.message).join(MESSAGE_SEPARATOR);
  }
  if (isPrismaError(error) && error.code === 'P2002') return alreadyExistsMessage(error.meta?.target);
  if (isPrismaError(error) && error.code === 'P2025') return 'ERROR_NOT_FOUND';
  // Library errors use subclasses (TypeError, PrismaClient…), so a plain Error is one of ours.
  if (error instanceof Error && error.name === 'Error' && error.message) return error.message;

  console.error(error);
  return 'ERROR_GENERIC';
}


// Round number to 2 decimal places
export function round2(value: number | string) {
  if (typeof value === 'number') {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  } else if (typeof value === 'string') {
    return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
  } else {
    throw new Error('Value is not a number or string');
  }
}

const CURRENCY_FORMATTER = new Intl.NumberFormat(NUMBER_LOCALE, {
  currency: CURRENCY,
  style: 'currency',
  minimumFractionDigits: 2,
});

// Also takes Prisma Decimals: server components get them raw (e.g. admin product list).
export function formatCurrency(amount: number | string | { toString(): string } | null) {
  if (typeof amount === 'number') {
    return CURRENCY_FORMATTER.format(amount);
  } else if (amount === null) {
    return 'NaN';
  } else {
    return CURRENCY_FORMATTER.format(Number(amount.toString()));
  }
}

// Shop windows show a calm "70 €"; cart, checkout and orders keep the exact "70,00 €".
const PRICE_TAG_FORMATTER = new Intl.NumberFormat(NUMBER_LOCALE, {
  currency: CURRENCY,
  style: 'currency',
  minimumFractionDigits: 2,
  trailingZeroDisplay: 'stripIfInteger',
});

export function formatPriceTag(amount: number) {
  return PRICE_TAG_FORMATTER.format(amount);
}

/** A price, or a wanted ad's budget as a calm "50–80 €" when it has an upper end ("80 €" with no lower end, its label says "up to"). */
export function formatPriceOrRange(amount: number | string, max?: number | string | null) {
  if (max && !Number(amount)) return PRICE_TAG_FORMATTER.format(Number(max));
  return max ? PRICE_TAG_FORMATTER.formatRange(Number(amount), Number(max)) : formatCurrency(amount);
}

const NUMBER_FORMATTER = new Intl.NumberFormat(NUMBER_LOCALE);

export function formatNumber(number: number) {
  return NUMBER_FORMATTER.format(number);
}


// Shorten UUID
export function formatId(id: string) {
  return `..${id.substring(id.length - 6)}`;
}

const DATE_TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
};
const DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  weekday: 'short',
  year: 'numeric',
  month: 'short',
  day: 'numeric',
};
const TIME_OPTIONS: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: 'numeric' };

/** Dates in the shop's time zone; pass the visitor's locale (getT / useI18n), or the shop's number locale is used. */
export const formatDateTime = (date: Date | string, locale: string = NUMBER_LOCALE) => {
  const format = (options: Intl.DateTimeFormatOptions) =>
    new Date(date).toLocaleString(locale, { ...options, timeZone: SHOP_TIME_ZONE });
  return {
    dateTime: format(DATE_TIME_OPTIONS),
    dateOnly: format(DATE_OPTIONS),
    timeOnly: format(TIME_OPTIONS),
  };
};

/** Customer-facing name of a payment method id; ids without a PAYMENT_METHOD_<ID> text show as is. */
export function paymentMethodLabel(t: Translator, id: string) {
  const key = `PAYMENT_METHOD_${id.toUpperCase()}`;
  const label = t(key as TranslationKey);
  return label === key ? id : label;
}



// Form the pagination links
export function formUrlQuery({
  params,
  key,
  value,
}: {
  params: string;
  key: string;
  value: string | null;
}) {
  const query = qs.parse(params);

  query[key] = value;

  return qs.stringifyUrl(
    {
      url: window.location.pathname,
      query,
    },
    {
      skipNull: true,
    }
  );
}

const TIME_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 60 * 60],
  ['month', 30 * 24 * 60 * 60],
  ['week', 7 * 24 * 60 * 60],
  ['day', 24 * 60 * 60],
  ['hour', 60 * 60],
  ['minute', 60],
];

/** How long ago, in the visitor's language: "2 days ago", "hace 2 días", "ieri". */
export function timeAgo(date: Date, locale: string, now = new Date()) {
  const seconds = Math.max(0, (now.getTime() - date.getTime()) / 1000);
  const [unit, size] = TIME_UNITS.find(([, unitSeconds]) => seconds >= unitSeconds) ?? TIME_UNITS[TIME_UNITS.length - 1];
  return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(-Math.floor(seconds / size), unit);
}
