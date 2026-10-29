'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LOCALES, type Locale } from '@/lib/i18n-core';
import { saveSellerName } from '@/lib/marketplace/checkout.actions';
import type { PublishPageTexts } from '@/lib/marketplace/page-texts';

interface SellerNameFormProps {
  token: string;
  texts: PublishPageTexts;
  /** What the person saved before; empty: their WhatsApp name shows. */
  name: string;
  /** Their WhatsApp name, shown as the placeholder. */
  defaultName: string | null;
  locale: Locale;
}

// Native select: on a phone it opens the system's own picker.
const SELECT_CLASS = 'h-10 w-full rounded-md border border-input bg-background px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:text-sm';

/** The name buyers see next to Contact (any nickname) and the language their message arrives in; changeable any time. */
export default function SellerNameForm({ token, texts, name: initialName, defaultName, locale: initialLocale }: SellerNameFormProps) {
  const [name, setName] = useState(initialName);
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const [isSaved, setIsSaved] = useState(false);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    startTransition(async () => {
      setError('');
      const result = await saveSellerName(token, name, locale);
      setIsSaved(result.success);
      if (!result.success) setError(result.isInvalidName ? texts.nameInvalid : texts.error);
    });
  };

  return (
    <form onSubmit={submit} className='space-y-4 rounded-3xl border border-border bg-card p-5 sm:p-6'>
      <h2 className='font-display text-xl'>{texts.nameTitle}</h2>
      <div className='space-y-2'>
        <Label htmlFor='seller-name'>{texts.nameLabel}</Label>
        <Input
          id='seller-name'
          autoComplete='nickname'
          maxLength={30}
          value={name}
          onChange={(event) => {
            setIsSaved(false);
            setName(event.target.value);
          }}
          placeholder={defaultName ?? ''}
          aria-describedby='seller-name-hint'
        />
        <p id='seller-name-hint' className='text-xs text-muted-foreground'>
          {texts.nameHint} {defaultName && texts.nameEmpty}
        </p>
      </div>
      <div className='space-y-2'>
        <Label htmlFor='seller-locale'>{texts.languageLabel}</Label>
        <select id='seller-locale' value={locale} onChange={(event) => {
            setIsSaved(false);
            setLocale(event.target.value as Locale);
          }} aria-describedby='seller-locale-hint' className={SELECT_CLASS}>
          {LOCALES.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
        <p id='seller-locale-hint' className='text-xs text-muted-foreground'>
          {texts.languageHint}
        </p>
      </div>
      {error && (
        <p role='alert' className='text-sm font-medium text-destructive'>
          {error}
        </p>
      )}
      <Button type='submit' variant='outline' className='w-full rounded-full' disabled={isPending}>
        {isPending ? <Loader2 className='size-4 animate-spin' aria-hidden /> : isSaved && <Check className='size-4' aria-hidden />}
        {isSaved ? texts.nameSaved : texts.nameSave}
      </Button>
    </form>
  );
}
