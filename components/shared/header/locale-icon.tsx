import type { CSSProperties } from 'react';
import { cn } from '@/lib/utils';
import type { Locale } from '@/lib/i18n-core';

interface LocaleIconProps {
  locale: Locale;
  className?: string;
}

const stripes = (direction: string, colors: string[]) =>
  `linear-gradient(${direction}, ${colors.map((color, index) => `${color} ${(index * 100) / colors.length}% ${((index + 1) * 100) / colors.length}%`).join(', ')})`;

// The colors of each language's flag as plain stripes, not the flag itself. Fixed per language, not theme colors.
const COLORS: Record<Locale, string> = {
  es: stripes('to bottom', ['#AA151B', '#F1BF00', '#F1BF00', '#AA151B']),
  // Plain stripes in these colors read as another country's flag: a red and white cross on blue says English.
  en: [
    'linear-gradient(to bottom, transparent 42%, #C8102E 42% 58%, transparent 58%)',
    'linear-gradient(to right, transparent 42%, #C8102E 42% 58%, transparent 58%)',
    'linear-gradient(to bottom, transparent 32%, #FFFFFF 32% 68%, transparent 68%)',
    'linear-gradient(to right, transparent 32%, #FFFFFF 32% 68%, transparent 68%)',
    'linear-gradient(#012169, #012169)',
  ].join(', '),
  it: stripes('to right', ['#009246', '#F4F5F0', '#CE2B37']),
  fr: stripes('to right', ['#0055A4', '#F4F5F0', '#EF4135']),
  de: stripes('to bottom', ['#000000', '#DD0000', '#FFCE00']),
};

const LocaleIcon = ({ locale, className }: LocaleIconProps) => (
  <span
    aria-hidden
    style={{ backgroundImage: COLORS[locale] } as CSSProperties}
    className={cn('size-7 shrink-0 rounded-full border border-border shadow-sm', className)}
  />
);

export default LocaleIcon;
