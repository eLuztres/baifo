'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { CheckCircle2, Loader2, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { changeSellerPhone } from '@/lib/marketplace/checkout.actions';
import { fill, type PublishPageTexts } from '@/lib/marketplace/page-texts';

interface SellerPhoneFormProps {
  token: string;
  texts: PublishPageTexts;
  /** The last digits of the number buyers write to; the whole number stays on the server. */
  phoneEnd: string;
}

/** The number buyers write to and that closes the listing, changeable with the current one. */
export default function SellerPhoneForm({ token, texts, phoneEnd: initialPhoneEnd }: SellerPhoneFormProps) {
  const [phoneEnd, setPhoneEnd] = useState(initialPhoneEnd);
  const [isEditing, setIsEditing] = useState(false);
  const [currentPhone, setCurrentPhone] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const startEditing = () => {
    setIsSaved(false);
    setIsEditing(true);
  };

  const stopEditing = () => {
    setIsEditing(false);
    setCurrentPhone('');
    setNewPhone('');
    setError('');
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    startTransition(async () => {
      setError('');
      const result = await changeSellerPhone(token, currentPhone, newPhone);
      if (result.success && result.phoneEnd) {
        setPhoneEnd(result.phoneEnd);
        stopEditing();
        setIsSaved(true);
      } else {
        setError(result.isInvalidPhone ? texts.phoneInvalid : result.isWrongPhone ? texts.closeWrongPhone : result.isTooMany ? texts.closeTooMany : texts.error);
      }
    });
  };

  return (
    <form onSubmit={submit} className='space-y-4 rounded-3xl border border-border bg-card p-5 sm:p-6'>
      <div className='space-y-1'>
        <h2 className='flex items-center gap-2 font-display text-xl'>
          <Phone className='size-5 shrink-0 text-primary' aria-hidden /> {texts.phoneTitle}
        </h2>
        {isSaved ? (
          <p role='status' className='flex items-start gap-2 text-sm'>
            <CheckCircle2 className='mt-0.5 size-4 shrink-0 text-primary' aria-hidden /> {fill(texts.phoneSaved, { end: phoneEnd })}
          </p>
        ) : (
          <p className='text-sm text-muted-foreground'>{fill(texts.phoneNow, { end: `··· ${phoneEnd}` })}</p>
        )}
      </div>
      {isEditing ? (
        <>
          <div className='space-y-2'>
            <Label htmlFor='current-phone'>{texts.phoneCurrent}</Label>
            <Input
              id='current-phone'
              type='tel'
              inputMode='tel'
              autoComplete='tel'
              required
              maxLength={30}
              value={currentPhone}
              onChange={(event) => setCurrentPhone(event.target.value)}
              aria-describedby='current-phone-hint'
            />
            <p id='current-phone-hint' className='text-xs text-muted-foreground'>
              {texts.closePhoneHint}
            </p>
          </div>
          <div className='space-y-2'>
            <Label htmlFor='new-phone'>{texts.phoneNew}</Label>
            <Input id='new-phone' type='tel' inputMode='tel' required maxLength={30} value={newPhone} onChange={(event) => setNewPhone(event.target.value)} />
          </div>
          {error && (
            <p role='alert' className='text-sm font-medium text-destructive'>
              {error}
            </p>
          )}
          <div className='flex flex-col gap-2 sm:flex-row-reverse'>
            <Button type='submit' className='rounded-full sm:flex-1' disabled={isPending}>
              {isPending && <Loader2 className='size-4 animate-spin' aria-hidden />}
              {texts.phoneSave}
            </Button>
            <Button type='button' variant='ghost' className='rounded-full' onClick={stopEditing} disabled={isPending}>
              {texts.phoneCancel}
            </Button>
          </div>
        </>
      ) : (
        <Button type='button' variant='outline' className='w-full rounded-full' onClick={startEditing}>
          {texts.phoneChange}
        </Button>
      )}
    </form>
  );
}
