'use client';

import { PenLine, Sparkles } from 'lucide-react';
import type { AdminTexts } from '@/lib/marketplace/admin-texts';
import type { TextMode } from '@/lib/marketplace/text-versions';
import { cn } from '@/lib/utils';

interface TextModeSwitchProps {
  value: TextMode;
  onChange: (mode: TextMode) => void;
  texts: AdminTexts;
  disabled?: boolean;
  /** Two cards with a line each, for the choice before the AI runs; small pills in the editor. */
  isCompact?: boolean;
}

const OPTIONS = [
  { mode: 'ai', icon: Sparkles },
  { mode: 'original', icon: PenLine },
] as const;

/** The admin's choice between the AI's text and their own words, which are only translated. */
export default function TextModeSwitch({ value, onChange, texts, disabled, isCompact }: TextModeSwitchProps) {
  const labelOf = (mode: TextMode) =>
    isCompact ? (mode === 'ai' ? texts.textAiShort : texts.textOriginalShort) : mode === 'ai' ? texts.textModeAi : texts.textModeOriginal;

  return (
    <div
      role='radiogroup'
      aria-label={texts.textModeQuestion}
      className={cn(isCompact ? 'inline-flex rounded-full bg-muted p-1' : 'grid grid-cols-2 gap-2')}
    >
      {OPTIONS.map(({ mode, icon: Icon }) => {
        const isChecked = mode === value;
        return (
          <button
            key={mode}
            type='button'
            role='radio'
            aria-checked={isChecked}
            disabled={disabled}
            onClick={() => !isChecked && onChange(mode)}
            className={cn(
              'transition disabled:opacity-60',
              isCompact
                ? cn(
                    'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium',
                    isChecked ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  )
                : cn(
                    'flex flex-col items-start gap-1 rounded-2xl border-2 p-3 text-left',
                    isChecked ? 'border-primary bg-primary/5' : 'border-border bg-background hover:border-primary/40'
                  )
            )}
          >
            <span className={cn('inline-flex items-center gap-1.5', !isCompact && 'font-medium')}>
              <Icon className={cn('size-4', isChecked && 'text-primary')} aria-hidden /> {labelOf(mode)}
            </span>
            {!isCompact && (
              <span className='text-xs text-muted-foreground'>{mode === 'ai' ? texts.textModeAiHint : texts.textModeOriginalHint}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
