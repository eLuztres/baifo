'use client';

import { useState, useTransition } from 'react';
import { Loader2, RotateCw, Sparkles } from 'lucide-react';
import ProductMedia from '@/components/ProductMedia';
import VoiceInputButton from '@/components/shared/voice-input-button';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { describeAdminListing, retryAdminListing, type AdminListing } from '@/lib/marketplace/admin.actions';
import type { AdminTexts } from '@/lib/marketplace/admin-texts';

interface DescriptionStepProps {
  listing: AdminListing;
  texts: AdminTexts;
  /** The listing as it is after sending: the AI writes it now. */
  onSent: (listing: AdminListing) => void;
}

/** Step 2: everything the admin knows about the item in one text; the AI turns it into the listing. */
export default function DescriptionStep({ listing, texts, onSent }: DescriptionStepProps) {
  const [notes, setNotes] = useState(listing.rawText);
  const [isForSeller, setIsForSeller] = useState(false);
  const [sellerPhone, setSellerPhone] = useState('');
  const [hasConsent, setHasConsent] = useState(false);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const isWriting = listing.status === 'PROCESSING' && !listing.lastError;

  const send = () =>
    startTransition(async () => {
      setError('');
      const phone = isForSeller ? sellerPhone.trim() : '';
      const result = await describeAdminListing(listing.id, { notes, sellerPhone: phone || undefined, hasContactConsent: Boolean(phone) && hasConsent });
      if (!result.success) return setError(result.message);
      onSent({ ...listing, status: 'PROCESSING', rawText: notes, lastError: null });
    });

  const retry = () =>
    startTransition(async () => {
      await retryAdminListing(listing.id);
      onSent({ ...listing, lastError: null });
    });

  return (
    <div className='mx-auto flex w-full max-w-xl flex-col gap-4'>
      <ul className='flex gap-3 overflow-x-auto p-1'>
        {listing.images.map((url, index) => (
          <li key={`${index}-${url}`} className={index === 0 ? 'relative size-24 shrink-0 overflow-hidden rounded-2xl bg-muted' : 'relative size-16 shrink-0 self-end overflow-hidden rounded-2xl bg-muted'}>
            <ProductMedia src={url} alt='' fill sizes='6rem' />
          </li>
        ))}
      </ul>

      <div className='space-y-2 rounded-3xl border border-border bg-card p-4 sm:p-5'>
        <div className='flex items-center justify-between gap-3'>
          <Label htmlFor='notes' className='font-display text-xl'>
            {texts.tellLabel}
          </Label>
          {/* Spoken words land in the field, where they can still be corrected before sending. */}
          {!isWriting && <VoiceInputButton onText={(text) => setNotes((current) => (current.trim() ? `${current.trimEnd()} ${text}` : text))} />}
        </div>
        <Textarea
          id='notes'
          rows={5}
          value={notes}
          readOnly={isWriting}
          onChange={(event) => setNotes(event.target.value)}
          placeholder={texts.tellPlaceholder}
          className='field-sizing-content max-h-[40svh] min-h-32 resize-none rounded-2xl bg-background text-base md:text-base'
        />
        {!isWriting && (
          <button
            type='button'
            onClick={() => setIsForSeller((current) => !current)}
            aria-expanded={isForSeller}
            className='rounded-full py-1 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline'
          >
            {texts.forSeller}
          </button>
        )}
        {isForSeller && !isWriting && (
          <div className='space-y-2 pt-1'>
            <Label htmlFor='seller'>{texts.sellerLabel}</Label>
            <Input
              id='seller'
              type='tel'
              autoFocus
              value={sellerPhone}
              onChange={(event) => setSellerPhone(event.target.value)}
              placeholder={texts.sellerPlaceholder}
              className='h-12 rounded-2xl bg-background'
            />
            <p className='text-xs text-muted-foreground'>{texts.sellerHint}</p>
            {sellerPhone.trim() && (
              <Label className='flex items-start gap-3 pt-1 font-normal leading-5'>
                <Checkbox checked={hasConsent} onCheckedChange={(value) => setHasConsent(value === true)} className='mt-0.5' />
                {texts.consent}
              </Label>
            )}
          </div>
        )}
      </div>

      {(error || listing.lastError) && (
        <div role='alert' className='flex items-center justify-between gap-3 rounded-2xl border border-destructive/40 p-3 text-sm text-destructive'>
          <span>{error || texts.errorGeneric}</span>
          {listing.lastError && (
            <Button variant='outline' size='sm' className='shrink-0 rounded-full' disabled={isPending} onClick={retry}>
              <RotateCw /> {texts.retry}
            </Button>
          )}
        </div>
      )}

      <div className='sticky bottom-4 z-10'>
        <Button className='h-14 w-full rounded-full text-base shadow-xl shadow-primary/20' disabled={isPending || isWriting} onClick={send}>
          {isPending || isWriting ? <Loader2 className='animate-spin' /> : <Sparkles />} {isWriting ? texts.writing : texts.writeListing}
        </Button>
      </div>
    </div>
  );
}
