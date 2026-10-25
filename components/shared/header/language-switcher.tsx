'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check } from 'lucide-react';
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
import LocaleIcon from './locale-icon';

function useChooseLocale() {
  const { locale } = useI18n();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const choose = (next: Locale) => {
    if (next === locale) return;
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    // A language in the URL (from Google) wins over the cookie, so it has to go.
    const url = new URL(window.location.href);
    if (url.searchParams.has('lang')) {
      url.searchParams.delete('lang');
      startTransition(() => router.replace(`${url.pathname}${url.search}${url.hash}`));
    } else {
      startTransition(() => router.refresh());
    }
  };

  return { locale, choose, isPending };
}

interface LanguageSwitcherProps {
  /** `compact`: a symbol button with a dropdown (header on desktop). `pills`: all languages side by side (mobile menu). */
  variant?: 'compact' | 'pills';
  className?: string;
}

export default function LanguageSwitcher({ variant = 'pills', className }: LanguageSwitcherProps) {
  const { t, locales } = useI18n();
  const { locale, choose, isPending } = useChooseLocale();
  // In the shop's own order (LOCALES in .env), not the built-in one.
  const options = LOCALES.filter((l) => locales.includes(l.id)).sort((a, b) => locales.indexOf(a.id) - locales.indexOf(b.id));
  const current = options.find((l) => l.id === locale) ?? options[0];

  if (options.length < 2) return null;

  if (variant === 'compact') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant='ghost'
            className={cn('h-12 gap-2.5 rounded-full border border-border bg-background/60 pl-1.5 pr-4 text-base font-semibold tracking-wider', isPending && 'opacity-60', className)}
            aria-label={`${t('LANGUAGE_LABEL')}: ${current.name}`}
          >
            <LocaleIcon locale={current.id} />
            {current.label}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end' className='min-w-60 p-1.5'>
          {options.map((l) => (
            <DropdownMenuItem
              key={l.id}
              lang={l.id}
              onSelect={() => choose(l.id)}
              className='flex items-center gap-3 px-3 py-2.5 text-base'
            >
              <LocaleIcon locale={l.id} />
              <span className='flex-1'>{l.name}</span>
              {l.id === locale ? (
                <Check className='size-5 text-primary' />
              ) : (
                <span className='text-sm text-muted-foreground'>{l.label}</span>
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
        'inline-flex flex-wrap items-center gap-1 rounded-3xl border border-border p-1 transition-opacity',
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
            'inline-flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-4 text-base font-semibold tracking-wider text-foreground/60 transition hover:text-foreground',
            locale === l.id && 'bg-muted text-foreground'
          )}
        >
          <LocaleIcon locale={l.id} />
          {l.label}
        </button>
      ))}
    </div>
  );
}
