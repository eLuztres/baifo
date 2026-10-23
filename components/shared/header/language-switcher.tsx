'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LOCALE_COOKIE, LOCALES, type Locale } from '@/lib/i18n-core';
import { useI18n } from '@/components/i18n-provider';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

function useChooseLocale() {
  const { locale } = useI18n();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const choose = (next: Locale) => {
    if (next === locale) return;
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    startTransition(() => router.refresh());
  };

  return { locale, choose, isPending };
}

interface LanguageSwitcherProps {
  /** `compact`: a globe button with a dropdown (header on desktop). `pills`: all languages side by side (mobile menu). */
  variant?: 'compact' | 'pills';
  className?: string;
}

export default function LanguageSwitcher({ variant = 'pills', className }: LanguageSwitcherProps) {
  const { t, locales } = useI18n();
  const { locale, choose, isPending } = useChooseLocale();
  const options = LOCALES.filter((l) => locales.includes(l.id));
  const current = options.find((l) => l.id === locale) ?? options[0];

  if (options.length < 2) return null;

  if (variant === 'compact') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant='ghost'
            className={cn('h-9 gap-1.5 rounded-full px-3 text-xs tracking-wider', isPending && 'opacity-60', className)}
            aria-label={`${t('LANGUAGE_LABEL')}: ${current.name}`}
          >
            <Globe className='!size-4' />
            {current.label}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end' className='min-w-40'>
          {options.map((l) => (
            <DropdownMenuItem
              key={l.id}
              lang={l.id}
              onSelect={() => choose(l.id)}
              className='flex items-center justify-between gap-4'
            >
              <span>{l.name}</span>
              {l.id === locale ? (
                <Check className='h-4 w-4 text-accent' />
              ) : (
                <span className='text-xs text-muted-foreground'>{l.label}</span>
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div
      role='group'
      aria-label={t('LANGUAGE_LABEL')}
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full border border-border p-1 transition-opacity',
        isPending && 'opacity-60',
        className
      )}
    >
      {options.map((l) => (
        <button
          key={l.id}
          type='button'
          onClick={() => choose(l.id)}
          aria-pressed={locale === l.id}
          title={l.name}
          lang={l.id}
          className={cn(
            'rounded-full px-3 py-1.5 text-xs font-medium tracking-wider text-foreground/55 transition hover:text-foreground',
            locale === l.id && 'bg-muted text-foreground'
          )}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
