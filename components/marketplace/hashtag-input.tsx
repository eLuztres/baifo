'use client';

import { useId, useMemo, useState, type KeyboardEvent } from 'react';
import { ChevronDown, Plus, X } from 'lucide-react';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MAX_HASHTAG_LENGTH, hashtagSlug, splitHashtags, toHashtagName } from '@/lib/hashtag-text';
import { fillText, type AdminTexts } from '@/lib/marketplace/admin-texts';
import { cn } from '@/lib/utils';
import type { HashtagOption } from './editor-types';

interface HashtagInputProps {
  id: string;
  /** The chosen hashtags. */
  value: string[];
  onChange: (names: string[]) => void;
  /** Every hashtag in the shop, the most used first. */
  options: HashtagOption[];
  max: number;
  isDisabled?: boolean;
  texts: AdminTexts;
  /** For the field's box, e.g. its background. */
  className?: string;
}

const MAX_SUGGESTIONS = 6;

interface Suggestion {
  name: string;
  /** How many listings use it; missing: it would be a new one. */
  count?: number;
}

/** Chips with the chosen hashtags; a dropdown to tick existing ones without typing, and "+" to type a new one. */
export default function HashtagInput({ id, value, onChange, options, max, isDisabled, texts, className }: HashtagInputProps) {
  const listboxId = useId();
  const [draft, setDraft] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  // Typing only after "+": picking an existing one never opens the phone's keyboard.
  const [isTyping, setIsTyping] = useState(false);
  const isFull = value.length >= max;

  const suggestions = useMemo<Suggestion[]>(() => {
    const typed = hashtagSlug(draft);
    const chosen = new Set(value.map(hashtagSlug));
    const free = options.filter((option) => !chosen.has(hashtagSlug(option.name)));
    const matching = typed ? free.filter((option) => hashtagSlug(option.name).includes(typed)) : free;
    // Those that start with the typed letters first; else the most used stay on top.
    const sorted = [...matching].sort((a, b) => Number(hashtagSlug(b.name).startsWith(typed)) - Number(hashtagSlug(a.name).startsWith(typed)));
    const isKnown = options.some((option) => hashtagSlug(option.name) === typed) || chosen.has(typed);
    return [...sorted.slice(0, MAX_SUGGESTIONS), ...(typed && !isKnown ? [{ name: toHashtagName(draft) }] : [])];
  }, [draft, options, value]);

  // A hashtag that exists keeps its own spelling: "musica" adds "música".
  const add = (names: string[]) => {
    const next = [...value];
    for (const name of names) {
      const slug = hashtagSlug(name);
      if (next.length < max && !next.some((chosen) => hashtagSlug(chosen) === slug)) {
        next.push(options.find((option) => hashtagSlug(option.name) === slug)?.name ?? name);
      }
    }
    onChange(next);
    setDraft('');
    setActiveIndex(-1);
  };

  // A space or comma ends a hashtag: read here, because phone keyboards don't report their keys.
  const handleTyping = (text: string) => {
    setIsOpen(true);
    setActiveIndex(-1);
    if (/[\s,;]/.test(text)) add(splitHashtags(text));
    else setDraft(text.replace(/#/g, ''));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      // Never the form's or the page's default: Enter only adds.
      event.preventDefault();
      const picked = suggestions[activeIndex];
      if (picked) add([picked.name]);
      else if (draft) add(splitHashtags(draft));
    } else if (event.key === 'Backspace' && !draft && value.length > 0) {
      onChange(value.slice(0, -1));
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setIsOpen(true);
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActiveIndex((index) => (suggestions.length ? (index + step + suggestions.length) % suggestions.length : -1));
    } else if (event.key === 'Escape') {
      setDraft('');
      setIsTyping(false);
    }
  };

  // Leaving the field keeps what was typed: Guardar must not lose it.
  const handleBlur = () => {
    setIsOpen(false);
    setIsTyping(false);
    if (draft) add(splitHashtags(draft));
  };

  const chosenSlugs = new Set(value.map(hashtagSlug));
  const toggle = (name: string, isChosen: boolean) =>
    isChosen ? add([name]) : onChange(value.filter((chosen) => hashtagSlug(chosen) !== hashtagSlug(name)));

  const isListShown = isOpen && !isFull && suggestions.length > 0;

  return (
    <div className='relative'>
      <div className={cn('flex min-h-12 flex-wrap items-center gap-1.5 rounded-2xl border border-border bg-background p-2 focus-within:ring-2 focus-within:ring-ring', isDisabled && 'opacity-50', className)}>
        {value.map((name) => (
          <span key={name} className='inline-flex min-w-0 max-w-full items-center gap-0.5 rounded-full bg-muted py-1 pl-2.5 pr-1 text-sm'>
            <span className='truncate'>#{name}</span>
            <button
              type='button'
              disabled={isDisabled}
              aria-label={fillText(texts.hashtagRemove, { name })}
              onClick={() => onChange(value.filter((chosen) => chosen !== name))}
              className='grid size-6 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-background hover:text-foreground'
            >
              <X className='size-3.5' aria-hidden />
            </button>
          </span>
        ))}
        {!isTyping && (
          <DropdownMenu>
            <DropdownMenuTrigger
              id={id}
              disabled={isDisabled}
              className='flex h-8 min-w-10 flex-1 items-center justify-between gap-2 rounded-full px-1 text-left text-base text-muted-foreground outline-none'
            >
              <span className='truncate'>{value.length === 0 ? texts.hashtagsChoose : ''}</span>
              <ChevronDown className='size-4 shrink-0 opacity-60' aria-hidden />
            </DropdownMenuTrigger>
            {/* The new hashtag's field takes the focus, not this button. */}
            <DropdownMenuContent align='end' className='max-h-72 w-64 overflow-y-auto rounded-2xl' onCloseAutoFocus={(event) => event.preventDefault()}>
              {options.map((option) => {
                const isChosen = chosenSlugs.has(hashtagSlug(option.name));
                return (
                  <DropdownMenuCheckboxItem
                    key={option.name}
                    checked={isChosen}
                    disabled={!isChosen && isFull}
                    onCheckedChange={(checked) => toggle(option.name, checked === true)}
                    // Stays open so several can be ticked in a row.
                    onSelect={(event) => event.preventDefault()}
                    className='rounded-xl'
                  >
                    <span className='min-w-0 flex-1 truncate'>#{option.name}</span>
                    <span className='text-xs text-muted-foreground'>{option.count}</span>
                  </DropdownMenuCheckboxItem>
                );
              })}
              {!isFull && (
                <>
                  {options.length > 0 && <DropdownMenuSeparator />}
                  <DropdownMenuItem onSelect={() => setIsTyping(true)} className='rounded-xl text-primary'>
                    <Plus aria-hidden /> {texts.hashtagNew}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {!isFull && !isTyping && (
          <button
            type='button'
            disabled={isDisabled}
            aria-label={texts.hashtagNew}
            title={texts.hashtagNew}
            onClick={() => setIsTyping(true)}
            className='grid size-8 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90'
          >
            <Plus className='size-4' aria-hidden />
          </button>
        )}
        {!isFull && isTyping && (
          <input
            id={id}
            autoFocus
            role='combobox'
            aria-expanded={isListShown}
            aria-controls={listboxId}
            aria-autocomplete='list'
            aria-activedescendant={activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined}
            autoComplete='off'
            autoCapitalize='none'
            enterKeyHint='done'
            maxLength={MAX_HASHTAG_LENGTH + 1}
            disabled={isDisabled}
            value={draft}
            placeholder={texts.hashtagsPlaceholder}
            onChange={(event) => handleTyping(event.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsOpen(true)}
            onBlur={handleBlur}
            className='h-8 min-w-16 flex-1 bg-transparent px-1 text-base outline-none placeholder:text-muted-foreground'
          />
        )}
      </div>
      {isTyping && isListShown && (
        <ul id={listboxId} role='listbox' className='absolute inset-x-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-2xl border border-border bg-popover p-1 text-popover-foreground shadow-lg'>
          {suggestions.map((suggestion, index) => (
            <li
              key={suggestion.name}
              id={`${listboxId}-${index}`}
              role='option'
              aria-selected={index === activeIndex}
              // Before the field's blur, which would add the half-typed word instead.
              onMouseDown={(event) => {
                event.preventDefault();
                add([suggestion.name]);
              }}
              className={cn('flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-xl px-3 text-sm hover:bg-accent', index === activeIndex && 'bg-accent')}
            >
              <span className='min-w-0 truncate'>#{suggestion.name}</span>
              {suggestion.count === undefined ? (
                <span className='inline-flex shrink-0 items-center gap-1 text-primary'>
                  <Plus className='size-3.5' aria-hidden /> {texts.hashtagCreate}
                </span>
              ) : (
                <span className='shrink-0 text-xs text-muted-foreground'>{suggestion.count}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
