'use client';

import { useState, useTransition } from 'react';
import { Languages, Loader2, RotateCw, Sparkles } from 'lucide-react';
import ProductMedia from '@/components/ProductMedia';
import VoiceInputButton from '@/components/shared/voice-input-button';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { describeAdminListing, retryAdminListing, type AdminListing } from '@/lib/marketplace/admin.actions';
import { fillText, type AdminTexts } from '@/lib/marketplace/admin-texts';
import type { TextMode } from '@/lib/marketplace/text-versions';
import { isVideoUrl } from '@/lib/video';
import type { EditorLanguage } from './listing-editor';
import TextModeSwitch from './text-mode-switch';

interface DescriptionStepProps {
  listing: AdminListing;
  /** The shop's other languages, which the text is translated into. */
  languages: EditorLanguage[];
  texts: AdminTexts;
  /** The listing as it is after sending: the AI writes it now. */
  onSent: (listing: AdminListing) => void;
}

/** Step 2: everything the admin knows about the item in one text; the AI turns it into the listing. */
export default function DescriptionStep({ listing, languages, texts, onSent }: DescriptionStepProps) {
  // A service always belongs to the person offering it, so their WhatsApp is asked for right away.
  const isService = listing.kind === 'service';
  const [notes, setNotes] = useState(listing.rawText);
  const [isForSeller, setIsForSeller] = useState(isService);
  const [sellerPhone, setSellerPhone] = useState('');
  const [hasConsent, setHasConsent] = useState(false);
  // Chosen before the AI runs: improve the text, or keep the admin's words and only translate them.
  const [textMode, setTextMode] = useState<TextMode>(listing.textMode as TextMode);
  const [originalTitle, setOriginalTitle] = useState(listing.originalTitle ?? '');
  const isOriginal = textMode === 'original';
  const languageList = languages.map(({ label }) => label).join(', ');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const isWriting = listing.status === 'PROCESSING' && !listing.lastError;
  // No photo (a video doesn't count): the AI makes the picture from this text, so the text can't be empty.
  const hasNoPhoto = listing.rawImages.every(isVideoUrl);
  const placeholder = isOriginal
    ? texts.tellOriginalPlaceholder
    : isService
      ? texts.tellServicePlaceholder
      : listing.isWanted
        ? texts.tellWantedPlaceholder
        : texts.tellPlaceholder;

  const send = () =>
    startTransition(async () => {
      setError('');
      const phone = isForSeller ? sellerPhone.trim() : '';
      const result = await describeAdminListing(listing.id, {
        notes,
        sellerPhone: phone || undefined,
        hasContactConsent: Boolean(phone) && hasConsent,
        textMode,
        originalTitle,
      });
      if (!result.success) return setError(result.message);
      onSent({ ...listing, status: 'PROCESSING', rawText: notes, textMode, lastError: null });
    });

  const retry = () =>
    startTransition(async () => {
      await retryAdminListing(listing.id);
      onSent({ ...listing, lastError: null });
    });

  return (
    <div className='mx-auto flex w-full max-w-xl flex-col gap-4'>
      {hasNoPhoto && (
        <p className='flex items-center gap-2 rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground'>
          <Sparkles className='size-4 shrink-0 text-primary' aria-hidden /> {texts.noPhotoHint}
        </p>
      )}
      <ul className='flex gap-3 overflow-x-auto p-1 empty:hidden'>
        {/* Before the AI picture of a video-only service, its videos. */}
        {(listing.images.length > 0 ? listing.images : listing.rawImages).map((url, index) => (
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
        {isOriginal && (
          <div className='space-y-1'>
            <Label htmlFor='original-title' className='px-1 text-xs text-muted-foreground'>
              {texts.originalTitleLabel}
            </Label>
            <Input
              id='original-title'
              value={originalTitle}
              readOnly={isWriting}
              onChange={(event) => setOriginalTitle(event.target.value)}
              placeholder={texts.originalTitlePlaceholder}
              className='h-12 rounded-2xl bg-background font-display text-lg md:text-lg'
            />
          </div>
        )}
        <Textarea
          id='notes'
          rows={5}
          value={notes}
          readOnly={isWriting}
          onChange={(event) => setNotes(event.target.value)}
          placeholder={placeholder}
          className='field-sizing-content max-h-[40svh] min-h-32 resize-none rounded-2xl bg-background text-base md:text-base'
        />
        <div className='space-y-2 pt-2'>
          <p className='text-sm font-medium'>{texts.textModeQuestion}</p>
          <TextModeSwitch value={textMode} onChange={setTextMode} texts={texts} disabled={isWriting} />
          {languageList && (
            <p className='px-1 text-xs text-muted-foreground'>
              {fillText(isOriginal ? texts.textModeOriginalResult : texts.textModeAiResult, { languages: languageList })}
            </p>
          )}
        </div>
        {!isWriting && !isService && (
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
            <Label htmlFor='seller'>{isService ? texts.servicePhoneLabel : texts.sellerLabel}</Label>
            <Input
              id='seller'
              type='tel'
              autoFocus={!isService}
              value={sellerPhone}
              onChange={(event) => setSellerPhone(event.target.value)}
              placeholder={texts.sellerPlaceholder}
              className='h-12 rounded-2xl bg-background'
            />
            <p className='text-xs text-muted-foreground'>{isService ? texts.servicePhoneHint : texts.sellerHint}</p>
            {sellerPhone.trim() && (
              <Label className='flex items-start gap-3 pt-1 font-normal leading-5'>
                <Checkbox checked={hasConsent} onCheckedChange={(value) => setHasConsent(value === true)} className='mt-0.5' />
                {isService ? texts.serviceConsent : texts.consent}
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
        <Button className='h-14 w-full rounded-full text-base shadow-xl shadow-primary/20' disabled={isPending || isWriting || ((isOriginal || hasNoPhoto) && !notes.trim())} onClick={send}>
          {isPending || isWriting ? <Loader2 className='animate-spin' /> : isOriginal ? <Languages /> : <Sparkles />}{' '}
          {isWriting ? (isOriginal ? texts.translatingNow : texts.writing) : isOriginal ? texts.translateButton : texts.writeListing}
        </Button>
      </div>
    </div>
  );
}
