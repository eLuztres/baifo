'use client';

import { PenLine, SpellCheck, Sparkles } from 'lucide-react';
import type { AdminTexts } from '@/lib/marketplace/admin-texts';
import type { TextMode } from '@/lib/marketplace/text-versions';
import { cn } from '@/lib/utils';

/** Only the labels it shows, so the category editor can pass its own; it has no "only fix mistakes". */
export type TextModeTexts = Pick<
  AdminTexts,
  'textModeQuestion' | 'textModeAi' | 'textModeAiHint' | 'textModeOriginal' | 'textModeOriginalHint' | 'textAiShort' | 'textOriginalShort'
> &
  Partial<Pick<AdminTexts, 'textModeCorrected' | 'textModeCorrectedHint' | 'textCorrectedShort'>>;

interface TextModeSwitchProps {
  value: TextMode;
  onChange: (mode: TextMode) => void;
  texts: TextModeTexts;
  disabled?: boolean;
  /** Cards with a line each, for the choice before the AI runs (three are stacked on phones); small pills in the editor. */
  isCompact?: boolean;
}

const OPTIONS = [
  { mode: 'ai', icon: Sparkles },
  { mode: 'corrected', icon: SpellCheck },
  { mode: 'original', icon: PenLine },
] as const;

/** The admin's choice between the AI's text, their own words with only the mistakes fixed, and their own words as they
    are; the last two are only translated. Without the "only fix mistakes" labels, that choice isn't offered. */
export default function TextModeSwitch({ value, onChange, texts, disabled, isCompact }: TextModeSwitchProps) {
  const options = OPTIONS.filter(({ mode }) => mode !== 'corrected' || texts.textModeCorrected);
  const labels = {
    ai: { label: texts.textModeAi, short: texts.textAiShort, hint: texts.textModeAiHint },
    corrected: { label: texts.textModeCorrected, short: texts.textCorrectedShort, hint: texts.textModeCorrectedHint },
    original: { label: texts.textModeOriginal, short: texts.textOriginalShort, hint: texts.textModeOriginalHint },
  };

  return (
    <div
      role='radiogroup'
      aria-label={texts.textModeQuestion}
      className={isCompact ? 'inline-flex rounded-full bg-muted p-1' : cn('grid gap-2', options.length === 3 ? 'sm:grid-cols-3' : 'grid-cols-2')}
    >
      {options.map(({ mode, icon: Icon }) => {
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
                    'inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-sm font-medium sm:px-3',
                    isChecked ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  )
                : cn(
                    'flex flex-col items-start gap-1 rounded-2xl border-2 p-3 text-left',
                    isChecked ? 'border-primary bg-primary/5' : 'border-border bg-background hover:border-primary/40'
                  )
            )}
          >
            <span className={cn('inline-flex items-center gap-1.5', !isCompact && 'font-medium')}>
              <Icon className={cn('size-4 shrink-0', isChecked && 'text-primary')} aria-hidden /> {isCompact ? labels[mode].short : labels[mode].label}
            </span>
            {!isCompact && (
              <span className='text-xs text-muted-foreground'>{labels[mode].hint}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
