'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { closeListing } from '@/lib/marketplace/checkout.actions';
import type { PublishPageTexts } from '@/lib/marketplace/page-texts';

interface CloseListingFormProps {
  token: string;
  texts: PublishPageTexts;
  isEvent: boolean;
}

/** On a live listing's private page: the person marks it sold, or cancels their event, with their number. */
export default function CloseListingForm({ token, texts, isEvent }: CloseListingFormProps) {
  const [phone, setPhone] = useState('');
  const [isClosed, setIsClosed] = useState(false);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    startTransition(async () => {
      setError('');
      const result = await closeListing(token, phone);
      if (result.success) setIsClosed(true);
      else setError(result.isWrongPhone ? texts.closeWrongPhone : result.isTooMany ? texts.closeTooMany : texts.error);
    });
  };

  if (isClosed) {
    return (
      <p role='status' className='flex items-start gap-2 rounded-3xl border border-primary/30 bg-card p-5 sm:p-6'>
        <CheckCircle2 className='mt-0.5 size-5 shrink-0 text-primary' aria-hidden /> {isEvent ? texts.closedCancelled : texts.closedSold}
      </p>
    );
  }

  return (
    <form onSubmit={submit} className='space-y-4 rounded-3xl border border-border bg-card p-5 sm:p-6'>
      <div className='space-y-1'>
        <h2 className='font-display text-xl'>{isEvent ? texts.closeCancelTitle : texts.closeSoldTitle}</h2>
        <p className='text-sm text-muted-foreground'>{isEvent ? texts.closeCancelText : texts.closeSoldText}</p>
      </div>
      <div className='space-y-2'>
        <Label htmlFor='close-phone'>{texts.closePhone}</Label>
        <Input
          id='close-phone'
          type='tel'
          inputMode='tel'
          autoComplete='tel'
          required
          maxLength={30}
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          aria-describedby='close-phone-hint'
        />
        <p id='close-phone-hint' className='text-xs text-muted-foreground'>
          {texts.closePhoneHint}
        </p>
      </div>
      {error && (
        <p role='alert' className='text-sm font-medium text-destructive'>
          {error}
        </p>
      )}
      <Button type='submit' variant='outline' className='w-full rounded-full' disabled={isPending}>
        {isPending && <Loader2 className='size-4 animate-spin' aria-hidden />}
        {isEvent ? texts.closeCancel : texts.closeSold}
      </Button>
    </form>
  );
}
