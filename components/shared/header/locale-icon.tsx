import type { CSSProperties } from 'react';
import { cn } from '@/lib/utils';
import type { Locale } from '@/lib/i18n-core';

interface LocaleIconProps {
  locale: Locale;
  className?: string;
}

interface LocaleSymbol {
  emoji: string;
  color: string;
}

// A playful symbol per language instead of a national flag, each on a tint that suits it. Fixed per language,
// not theme colors; mixed with transparency so they sit on light and dark backgrounds alike.
const SYMBOLS: Record<Locale, LocaleSymbol> = {
  en: { emoji: '🗽', color: '#3FA796' },
  es: { emoji: '🐂', color: '#E3A008' },
  de: { emoji: '🥨', color: '#A0622D' },
  fr: { emoji: '🍷', color: '#9B2C55' },
  it: { emoji: '🍕', color: '#E5483B' },
};

const LocaleIcon = ({ locale, className }: LocaleIconProps) => (
  <span
    aria-hidden
    style={{ '--locale-color': SYMBOLS[locale].color } as CSSProperties}
    className={cn(
      'grid size-9 shrink-0 place-items-center rounded-full text-xl leading-none',
      'border-2 border-[color:color-mix(in_srgb,var(--locale-color)_85%,transparent)] bg-[color:color-mix(in_srgb,var(--locale-color)_40%,transparent)]',
      className
    )}
  >
    {SYMBOLS[locale].emoji}
  </span>
);

export default LocaleIcon;
