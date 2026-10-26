'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import { useTheme } from 'next-themes';
import { SunIcon, MoonIcon, SunMoon } from 'lucide-react';
import { useI18n } from '@/components/i18n-provider';
import type { TranslationKey } from '@/lib/i18n-core';
import { cn } from '@/lib/utils';

interface ModeToggleProps {
  /** `compact`: an icon button with a dropdown (header on desktop). `pills`: the three choices side by side (mobile menu). */
  variant?: 'compact' | 'pills';
  className?: string;
}

const MODES: { id: 'system' | 'light' | 'dark'; label: TranslationKey; icon: typeof SunIcon }[] = [
  { id: 'system', label: 'THEME_SYSTEM', icon: SunMoon },
  { id: 'light', label: 'THEME_LIGHT', icon: SunIcon },
  { id: 'dark', label: 'THEME_DARK', icon: MoonIcon },
];

const ModeToggle = ({ variant = 'compact', className }: ModeToggleProps) => {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();
  const { t } = useI18n();

  useEffect(() => {
    setMounted(true);
  }, []);

  // The saved theme is only known in the browser; rendering before would flash the wrong choice.
  if (!mounted) {
    return null;
  }

  if (variant === 'pills') {
    return (
      <div
        role='group'
        aria-label={t('THEME_LABEL')}
        // Three equal parts in one row, also on the narrowest phones.
        className={cn('grid w-full grid-cols-3 gap-1 rounded-3xl border border-border p-1', className)}
      >
        {MODES.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type='button'
            onClick={() => setTheme(id)}
            aria-pressed={theme === id}
            className={cn(
              'flex flex-col items-center gap-1 rounded-2xl px-2 py-2 text-xs font-medium text-foreground/60 transition hover:text-foreground',
              theme === id && 'bg-muted text-foreground'
            )}
          >
            <Icon className='size-5' aria-hidden />
            {t(label)}
          </button>
        ))}
      </div>
    );
  }

  const Current = MODES.find((mode) => mode.id === theme)?.icon ?? SunIcon;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant='ghost' size='icon' className={cn('rounded-full', className)} aria-label={t('THEME_LABEL')}>
          <Current />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end'>
        <DropdownMenuLabel>{t('THEME_LABEL')}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {MODES.map(({ id, label, icon: Icon }) => (
          <DropdownMenuCheckboxItem key={id} checked={theme === id} onClick={() => setTheme(id)}>
            <Icon className='size-4' aria-hidden /> {t(label)}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ModeToggle;
