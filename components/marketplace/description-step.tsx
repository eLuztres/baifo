'use client';

import { useState, useTransition } from 'react';
import { useI18n } from '@/components/i18n-provider';
import { aiErrorText } from '@/lib/ai-errors';
import { Check, Languages, Loader2, RotateCw, Sparkles } from 'lucide-react';
import ProductMedia from '@/components/ProductMedia';
import VoiceInputButton from '@/components/shared/voice-input-button';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { describeAdminListing, retryAdminListing, type AdminListing } from '@/lib/marketplace/admin.actions';
import { fillText, type AdminTexts } from '@/lib/marketplace/admin-texts';
import type { TextMode } from '@/lib/marketplace/text-versions';
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
  const [notes, setNotes] = useState(listing.rawText);
  const [sellerPhone, setSellerPhone] = useState('');
  // Chosen before the AI runs: improve the text, or keep the admin's words (maybe with their mistakes fixed) and translate them.
  const [textMode, setTextMode] = useState<TextMode>(listing.textMode as TextMode);
  const [originalTitle, setOriginalTitle] = useState(listing.originalTitle ?? '');
  const isOriginal = textMode === 'original';
  const isOwnWords = textMode !== 'ai';
  const modeResults = { ai: texts.textModeAiResult, corrected: texts.textModeCorrectedResult, original: texts.textModeOriginalResult };
  const languageList = languages.map(({ label }) => label).join(', ');
  const { t } = useI18n();
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  // Sent: the AI writes the text, and the pictures may still be on their way. The editor comes once both are there.
  const isWriting = listing.status === 'PROCESSING' && !listing.lastError;
  // No photo (a video without a still doesn't count): the AI makes the picture from this text, so the text can't be empty.
  const hasNoPhoto = !listing.rawImages.some(pictureOf);
  const hasPictures = listing.images.length > 0;
  // The AI's pictures run on their own since the upload (without a photo: since sending), so the admin writes meanwhile.
  const showsPictureWork = listing.usesAi && !listing.lastError && (!hasNoPhoto || isWriting);
  const hasText = Boolean(listing.title);
  const placeholder = isOwnWords
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
      // Buyers always write to the person's own WhatsApp ("through the Corral" is parked, #131).
      if (!sellerPhone.trim()) return setError(texts.contactNeedsNumber);
      const result = await describeAdminListing(listing.id, {
        notes,
        sellerPhone: sellerPhone.trim(),
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
      {/* What the AI is doing, part by part; nothing here blocks the form. */}
      {(showsPictureWork || isWriting) && (
        <ul aria-live='polite' className='flex flex-wrap gap-2 text-sm'>
          {showsPictureWork && <WorkState isDone={hasPictures} label={hasPictures ? texts.picturesReady : texts.picturesWorking} />}
          {isWriting && <WorkState isDone={hasText} label={hasText ? texts.textReady : isOriginal ? texts.translatingNow : texts.writing} />}
        </ul>
      )}
      <ul className='flex gap-3 overflow-x-auto p-1 empty:hidden'>
        {/* The originals until the AI pictures arrive, which then take their place. Before the AI picture of a video-only service, its videos. */}
        {(hasPictures ? listing.images : listing.rawImages).map((url, index) => (
          <li key={`${index}-${url}`} className={index === 0 ? 'relative size-24 shrink-0 overflow-hidden rounded-2xl bg-muted' : 'relative size-16 shrink-0 self-end overflow-hidden rounded-2xl bg-muted'}>
            <ProductMedia src={url} alt='' fill sizes='6rem' />
            {showsPictureWork && !hasPictures && <span className='absolute inset-0 animate-pulse bg-primary/20 motion-reduce:animate-none' aria-hidden />}
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
        {isOwnWords && (
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
              {fillText(modeResults[textMode], { languages: languageList })}
            </p>
          )}
        </div>
        {!isWriting && (
          <div className='space-y-2 pt-1'>
            <Label htmlFor='seller'>{texts.servicePhoneLabel}</Label>
            <Input
              id='seller'
              type='tel'
              value={sellerPhone}
              onChange={(event) => setSellerPhone(event.target.value)}
              placeholder={texts.sellerPlaceholder}
              className='h-12 rounded-2xl bg-background'
            />
            {/* Wanted ads and events have no seller: the number is the person behind them. */}
            <p className='text-xs text-muted-foreground'>{isService || isWanted ? texts.servicePhoneHint : listing.type === 'EVENT' ? texts.eventPhoneHint : texts.sellerHint}</p>
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

      {/* Not sticky: on phones a floating button jumped over the field with the keyboard open. */}
      <Button
        size='lg'
        className='w-full rounded-full'
        disabled={isPending || isWriting || ((isOwnWords || hasNoPhoto) && !notes.trim())} onClick={send}>
        {isPending || isWriting ? <Loader2 className='animate-spin' /> : isOriginal ? <Languages /> : <Sparkles />}{' '}
        {/* While the AI works, the parts above say what it is doing; the button doesn't repeat them. */}
        {isWriting ? texts.status_PROCESSING : isOriginal ? texts.translateButton : texts.writeListing}
      </Button>
    </div>
  );
}

interface WorkStateProps {
  isDone: boolean;
  label: string;
}

/** One part of the AI's work (pictures or text): busy, or done. */
function WorkState({ isDone, label }: WorkStateProps) {
  return (
    <li className='inline-flex min-w-0 items-center gap-2 rounded-full bg-muted px-3 py-1.5'>
      {isDone ? <Check className='size-4 shrink-0 text-primary' aria-hidden /> : <Loader2 className='size-4 shrink-0 animate-spin text-primary' aria-hidden />}
      {label}
    </li>
  );
}
