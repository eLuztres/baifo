'use client';

import { useState, useTransition, type KeyboardEvent } from 'react';
import { ChevronDown, Languages, Loader2, Plus, X } from 'lucide-react';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { translateTags } from '@/lib/actions/tag.actions';
import type { Locale } from '@/lib/i18n-core';
import { fillText, type AdminTexts } from '@/lib/marketplace/admin-texts';
import { MAX_TAG_LENGTH, byTagName, cleanTagName, tagNameIn, tagNameKey, withMissingNames } from '@/lib/tag-names';
import { cn } from '@/lib/utils';
import type { EditorTag, TagOption } from './editor-types';

interface TagInputProps {
  id: string;
  /** The chosen etiquetas. */
  value: EditorTag[];
  onChange: (tags: EditorTag[]) => void;
  /** Every etiqueta in the shop. */
  options: TagOption[];
  /** The selected tab's language: names are shown, chosen and written in it, and translated from it. */
  language: Locale;
  /** Every shop language, to know what is still untranslated. */
  languages: Locale[];
  max: number;
  isDisabled?: boolean;
  texts: AdminTexts;
  onError: (message: string) => void;
}

// Chosen ones are the same etiqueta as an option by id, or by a name in this language while still new.
const isSameTag = (language: Locale) => (a: EditorTag, b: EditorTag) =>
  a.id && b.id ? a.id === b.id : Boolean(a.names[language]) && tagNameKey(a.names[language] ?? '') === tagNameKey(b.names[language] ?? '');

/** The listing's etiquetas in the selected tab's language: tick existing ones A to Z, "+" makes a new one, "Traducir" fills the other languages. */
export default function TagInput({ id, value, onChange, options, language, languages, max, isDisabled, texts, onError }: TagInputProps) {
  const [draft, setDraft] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isTranslating, startTranslating] = useTransition();
  const isFull = value.length >= max;
  const same = isSameTag(language);
  const isChosen = (option: TagOption) => value.some((chosen) => same(chosen, option));
  const sorted = [...options].sort(byTagName(language));
  // Only names this tab has can be translated from it; the button shows while one of them still lacks a language.
  const toTranslate = value.filter((tag) => tag.names[language] && languages.some((other) => !tag.names[other]));

  // A typed name an etiqueta already has in this language is that etiqueta.
  const addTyped = () => {
    const name = cleanTagName(draft);
    setDraft('');
    setIsTyping(false);
    if (!name || isFull) return;
    const typed: EditorTag = { names: { [language]: name } };
    const existing = options.find((option) => same(option, typed));
    if (!value.some((chosen) => same(chosen, existing ?? typed))) onChange([...value, existing ?? typed]);
  };

  const toggle = (option: TagOption, checked: boolean) => onChange(checked ? [...value, option] : value.filter((chosen) => !same(chosen, option)));

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      // Never the form's default: Enter only adds.
      event.preventDefault();
      addTyped();
    } else if (event.key === 'Escape') {
      setDraft('');
      setIsTyping(false);
    }
  };

  const translate = () =>
    startTranslating(async () => {
      const result = await translateTags(language, toTranslate.map((tag) => tag.names[language]!));
      if (!result.success) return onError(result.message);
      onChange(value.map((tag) => {
        const index = toTranslate.indexOf(tag);
        return index < 0 ? tag : { ...tag, names: withMissingNames(tag.names, result.translations[index] ?? {}) };
      }));
    });

  return (
    <div className={cn('flex min-h-12 flex-wrap items-center gap-1.5 rounded-2xl border border-border bg-background p-2 focus-within:ring-2 focus-within:ring-ring', isDisabled && 'opacity-50')}>
      {toTranslate.length > 0 && (
        <button
          type='button'
          disabled={isDisabled || isTranslating}
          onClick={translate}
          title={texts.tagsTranslateHint}
          className='inline-flex h-8 shrink-0 items-center gap-1 rounded-full border border-primary px-2.5 text-sm font-medium text-primary hover:bg-primary/10'
        >
          {isTranslating ? <Loader2 className='size-4 animate-spin' aria-hidden /> : <Languages className='size-4' aria-hidden />}
          {texts.tagsTranslate}
        </button>
      )}
      {[...value].sort(byTagName(language)).map((tag) => {
        const name = tagNameIn(tag.names, language);
        const isMissing = !tag.names[language];
        return (
          <span
            key={tag.id ?? `new-${tagNameKey(name)}`}
            title={isMissing ? texts.tagNotTranslated : undefined}
            className={cn('inline-flex min-w-0 max-w-full items-center gap-0.5 rounded-full border py-0.5 pl-2.5 pr-0.5 text-sm', isMissing ? 'border-dashed border-border italic text-muted-foreground' : 'border-transparent bg-muted')}
          >
            <span className='truncate'>{name}</span>
            {isMissing && <span className='font-semibold not-italic text-primary'>?</span>}
            <button
              type='button'
              disabled={isDisabled}
              aria-label={fillText(texts.tagRemove, { name })}
              onClick={() => onChange(value.filter((chosen) => chosen !== tag))}
              className='grid size-6 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-background hover:text-foreground'
            >
              <X className='size-3.5' aria-hidden />
            </button>
          </span>
        );
      })}
      {!isTyping && (
        <DropdownMenu>
          <DropdownMenuTrigger
            id={id}
            disabled={isDisabled}
            className='flex h-8 min-w-10 flex-1 items-center justify-between gap-2 rounded-full px-1 text-left text-base text-muted-foreground outline-none'
          >
            <span className='truncate'>{value.length === 0 ? texts.tagsChoose : ''}</span>
            <ChevronDown className='size-4 shrink-0 opacity-60' aria-hidden />
          </DropdownMenuTrigger>
          {/* The new etiqueta's field takes the focus, not this button. */}
          <DropdownMenuContent align='end' className='max-h-72 w-64 overflow-y-auto rounded-2xl' onCloseAutoFocus={(event) => event.preventDefault()}>
            {sorted.map((option) => {
              const checked = isChosen(option);
              return (
                <DropdownMenuCheckboxItem
                  key={option.id}
                  checked={checked}
                  disabled={!checked && isFull}
                  onCheckedChange={(next) => toggle(option, next === true)}
                  // Stays open so several can be ticked in a row.
                  onSelect={(event) => event.preventDefault()}
                  className='rounded-xl'
                >
                  <span className={cn('min-w-0 flex-1 truncate', !option.names[language] && 'italic text-muted-foreground')}>{tagNameIn(option.names, language)}</span>
                  <span className='text-xs text-muted-foreground'>{option.count}</span>
                </DropdownMenuCheckboxItem>
              );
            })}
            {!isFull && (
              <>
                {sorted.length > 0 && <DropdownMenuSeparator />}
                <DropdownMenuItem onSelect={() => setIsTyping(true)} className='rounded-xl text-primary'>
                  <Plus aria-hidden /> {texts.tagNew}
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
          aria-label={texts.tagNew}
          title={texts.tagNew}
          onClick={() => setIsTyping(true)}
          className='grid size-8 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90'
        >
          <Plus className='size-4' aria-hidden />
        </button>
      )}
      {isTyping && (
        <input
          id={id}
          autoFocus
          aria-label={texts.tagNew}
          autoComplete='off'
          enterKeyHint='done'
          maxLength={MAX_TAG_LENGTH}
          disabled={isDisabled}
          value={draft}
          placeholder={texts.tagsPlaceholder}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          // Leaving the field keeps what was typed: Guardar must not lose it.
          onBlur={addTyped}
          className='h-8 min-w-24 flex-1 bg-transparent px-1 text-base outline-none placeholder:text-muted-foreground'
        />
      )}
    </div>
  );
}
