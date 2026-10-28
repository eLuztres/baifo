'use client';

import { useState, useTransition } from 'react';
import { useI18n } from '@/components/i18n-provider';
import { aiErrorText } from '@/lib/ai-errors';
import { Languages, Loader2, MessageCircle, RotateCw, Sparkles, Store } from 'lucide-react';
import ProductMedia from '@/components/ProductMedia';
import VoiceInputButton from '@/components/shared/voice-input-button';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { describeAdminListing, retryAdminListing, type AdminListing } from '@/lib/marketplace/admin.actions';
import { fillText, type AdminTexts } from '@/lib/marketplace/admin-texts';
import type { TextMode } from '@/lib/marketplace/text-versions';
import { cn } from '@/lib/utils';
import { pictureOf } from '@/lib/video';
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
  const isService = listing.type === 'SERVICE';
  const isWanted = listing.type === 'WANTED';
  const { toast } = useToast();
  const [notes, setNotes] = useState(listing.rawText);
  // Most listings are the person's own, so their WhatsApp comes first; the Corral is the paid extra.
  const [isForSeller, setIsForSeller] = useState(true);
  // Only a click on "the person's WhatsApp" jumps to the number, not the page opening with it chosen.
  const [hasPickedPerson, setHasPickedPerson] = useState(false);
  const [sellerPhone, setSellerPhone] = useState('');
  // Chosen before the AI runs: improve the text, or keep the admin's words and only translate them.
  const [textMode, setTextMode] = useState<TextMode>(listing.textMode as TextMode);
  const [originalTitle, setOriginalTitle] = useState(listing.originalTitle ?? '');
  const isOriginal = textMode === 'original';
  const languageList = languages.map(({ label }) => label).join(', ');
  const { t } = useI18n();
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const isWriting = listing.status === 'PROCESSING' && !listing.lastError;
  // No photo (a video without a still doesn't count): the AI makes the picture from this text, so the text can't be empty.
  const hasNoPhoto = !listing.rawImages.some(pictureOf);
  const placeholder = isOriginal
    ? texts.tellOriginalPlaceholder
    : isService
      ? texts.tellServicePlaceholder
      : listing.type === 'EVENT'
        ? texts.tellEventPlaceholder
        : isWanted
          ? texts.tellWantedPlaceholder
          : texts.tellPlaceholder;

  const send = () =>
    startTransition(async () => {
      setError('');
      // The person's own OK to show their number comes later, on their page or by WhatsApp.
      if (isForSeller && !sellerPhone.trim()) return setError(texts.contactNeedsNumber);
      const phone = isForSeller ? sellerPhone.trim() : '';
      const result = await describeAdminListing(listing.id, {
        notes,
        sellerPhone: phone || undefined,
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
        {/* How buyers reach it: the person's own WhatsApp, or the Corral's (the admin's) with no number on the page. */}
        {!isWriting && (
          <div role='radiogroup' aria-label={texts.contactQuestion} className='space-y-2 pt-2'>
            <p className='text-sm font-medium'>{texts.contactQuestion}</p>
            {/* Side by side on phones too, like the text choice above, so it takes little room. */}
            <div className='grid grid-cols-2 gap-2'>
              {[
                { isPerson: true, icon: MessageCircle, label: texts.contactPerson, hint: texts.contactPersonHint },
                { isPerson: false, icon: Store, label: texts.contactCorral, hint: texts.contactCorralHint },
              ].map(({ isPerson, icon: Icon, label, hint }) => (
                <button
                  key={label}
                  type='button'
                  role='radio'
                  aria-checked={isForSeller === isPerson}
                  onClick={() => {
                    // The Corral handling the contact is paid for: remind the admin to check that first.
                    if (!isPerson && isForSeller) toast({ description: texts.corralExtraCheck });
                    setHasPickedPerson(isPerson);
                    setIsForSeller(isPerson);
                  }}
                  className={cn(
                    'flex flex-col items-start gap-1 rounded-2xl border-2 p-3 text-left transition',
                    isForSeller === isPerson ? 'border-primary bg-primary/5' : 'border-border bg-background hover:border-primary/40'
                  )}
                >
                  <span className='inline-flex items-center gap-1.5 text-sm font-medium'>
                    <Icon className={cn('size-4 shrink-0', isForSeller === isPerson && 'text-primary')} aria-hidden /> {label}
                  </span>
                  <span className='text-xs text-muted-foreground'>{hint}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        {isForSeller && !isWriting && (
          <div className='space-y-2 pt-1'>
            <Label htmlFor='seller'>{texts.servicePhoneLabel}</Label>
            <Input
              id='seller'
              type='tel'
              autoFocus={hasPickedPerson}
              value={sellerPhone}
              onChange={(event) => setSellerPhone(event.target.value)}
              placeholder={texts.sellerPlaceholder}
              className='h-12 rounded-2xl bg-background'
            />
            {/* A wanted ad has no seller: the number is the person looking. */}
            <p className='text-xs text-muted-foreground'>{isService || isWanted ? texts.servicePhoneHint : texts.sellerHint}</p>
            {isWanted && <p className='text-xs text-muted-foreground'>{texts.wantedContactNote}</p>}
          </div>
        )}
      </div>

      {(error || listing.lastError) && (
        <div role='alert' className='flex items-center justify-between gap-3 rounded-2xl border border-destructive/40 p-3 text-sm text-destructive'>
          <span>{error || aiErrorText(t, listing.lastError) || texts.errorGeneric}</span>
          {listing.lastError && (
            <Button variant='outline' size='sm' className='shrink-0 rounded-full' disabled={isPending} onClick={retry}>
              <RotateCw /> {texts.retry}
            </Button>
          )}
        </div>
      )}

      <div className='sticky bottom-4 z-10'>
        {/* Solid even when disabled: it floats over the form, which must not show through it. */}
        <Button
          className='h-14 w-full rounded-full text-base shadow-xl shadow-primary/20 disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100'
          disabled={isPending || isWriting || ((isOriginal || hasNoPhoto) && !notes.trim())} onClick={send}>
          {isPending || isWriting ? <Loader2 className='animate-spin' /> : isOriginal ? <Languages /> : <Sparkles />}{' '}
          {isWriting ? (isOriginal ? texts.translatingNow : texts.writing) : isOriginal ? texts.translateButton : texts.writeListing}
        </Button>
      </div>
    </div>
  );
}
