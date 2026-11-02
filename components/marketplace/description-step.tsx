'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useI18n } from '@/components/i18n-provider';
import { aiErrorText } from '@/lib/ai-errors';
import { Check, Loader2, RotateCw, Send, Sparkles } from 'lucide-react';
import VoiceInputButton from '@/components/shared/voice-input-button';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { describeAdminListing, draftAdminListingText, retryAdminListing, type AdminListing } from '@/lib/marketplace/admin.actions';
import { fillText, type AdminTexts } from '@/lib/marketplace/admin-texts';
import { findPhoneInText } from '@/lib/marketplace/phone-in-text';
import type { ListingTexts, TextMode } from '@/lib/marketplace/text-versions';
import { DEFAULT_PRICE_MODES, PRICE_MODES, type PriceMode } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { pictureOf } from '@/lib/video';
import type { EditorLanguage } from './listing-editor';

interface DescriptionStepProps {
  listing: AdminListing;
  /** The shop's other languages, which the text is translated into. */
  languages: EditorLanguage[];
  /** The shop's own language, the first tab of the texts. */
  shopLanguage: EditorLanguage;
  texts: AdminTexts;
  /** The listing as it is after sending: the AI writes it now. */
  onSent: (listing: AdminListing) => void;
  /** The step the workspace's bar shows: 0 the pictures (only the finish button here), 1 the description, 2 the contact. */
  step: number;
  /** Opens the step where something is missing. */
  onStep: (step: number) => void;
}

/** Steps 2 and 3: everything the admin knows about the item in one text, then the person's contact; the AI turns it into the listing. */
export default function DescriptionStep({ listing, languages, shopLanguage, texts, onSent, step, onStep }: DescriptionStepProps) {
  const isOnContact = step === 2;
  const isService = listing.type === 'SERVICE';
  const isEvent = listing.type === 'EVENT';
  // "Ofrezco | Busco" on an Anuncio: the admin says it, the AI doesn't guess it.
  const [isWanted, setIsWanted] = useState(listing.type === 'WANTED');
  // A search's price usually is its top budget, an offer's a set price; one the admin typed stays.
  const chooseWanted = (wanted: boolean) => {
    setIsWanted(wanted);
    if (!price) setPriceMode(wanted ? 'UP_TO' : 'FIXED');
  };
  const [notes, setNotes] = useState(listing.rawText);
  const [sellerPhone, setSellerPhone] = useState('');
  const [sellerName, setSellerName] = useState('');
  const notesInput = useRef<HTMLTextAreaElement>(null);
  // How "Crear descripción" treats the words: improved, corrected (the default) or only translated; always into every language.
  const [textMode, setTextMode] = useState<TextMode>(listing.title ? (listing.textMode as TextMode) : 'corrected');
  const isOriginal = textMode === 'original';
  // The texts "Crear descripción" made, in every language, as the admin edits them; empty until it ran.
  const textLanguages = [shopLanguage, ...languages];
  const [draft, setDraft] = useState<ListingTexts>(() =>
    listing.title
      ? { ...(listing.translations as ListingTexts), [shopLanguage.id]: { title: listing.title, description: listing.description ?? '', short: listing.shortTitle ?? '' } }
      : {}
  );
  const hasDraft = Boolean(draft[shopLanguage.id]?.title);
  const [isDrafting, setIsDrafting] = useState(false);
  const [textLanguage, setTextLanguage] = useState(shopLanguage.id);
  const shownText = draft[textLanguage] ?? { title: '', description: '' };
  const setShownText = (name: 'title' | 'description') => (value: string) =>
    setDraft((current) => ({ ...current, [textLanguage]: { ...(current[textLanguage] ?? { title: '', description: '' }), [name]: value } }));
  // Optional: a kind of price and its amount; an event only has its entry.
  const [priceMode, setPriceMode] = useState<PriceMode>(listing.priceMode ?? DEFAULT_PRICE_MODES[listing.type]);
  const [price, setPrice] = useState(listing.price ?? '');
  const { t, locale } = useI18n();
  const [error, setError] = useState('');
  const errorBox = useRef<HTMLDivElement>(null);
  // The message sits by the button, which can be below the screen after the step changed.
  useEffect(() => {
    if (error) errorBox.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [error]);
  const [isPending, startTransition] = useTransition();
  // Sent: the AI writes the text, and the pictures may still be on their way. The editor comes once both are there.
  const isWriting = listing.status === 'PROCESSING' && !listing.lastError;
  // A video without a still doesn't count as a picture.
  const hasNoPhoto = listing.images.length === 0 && !listing.rawImages.some(pictureOf);
  // The person's OK to show their number, confirmed by the admin who creates the listing with them.
  const [hasConsent, setHasConsent] = useState(false);
  // A "missing" message is old news as soon as something is filled in.
  useEffect(() => setError(''), [notes, sellerPhone, hasConsent]);
  const hasText = Boolean(listing.title);
  const placeholder = isService
      ? texts.tellServicePlaceholder
      : isEvent
        ? texts.tellEventPlaceholder
        : isWanted
          ? texts.tellWantedPlaceholder
          : texts.tellPlaceholder;

  // A number already written in the description is most likely the contact; the admin can still change it.
  useEffect(() => {
    if (isOnContact) setSellerPhone((current) => current.trim() || findPhoneInText(notes));
    // Only when the contact opens: typing in the description must not overwrite the number.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnContact]);

  const send = () =>
    startTransition(async () => {
      setError('');
      // Buyers always write to the person's own WhatsApp ("through the Corral" is parked, #131).
      // Everything missing in one message, and the first step it is on opens.
      const missing = [
        hasNoPhoto && { step: 0, text: texts.missingPicture },
        !notes.trim() && { step: 1, text: texts.missingText },
        Boolean(notes.trim()) && !hasDraft && { step: 1, text: texts.missingDraft },
        !sellerPhone.trim() && { step: 2, text: texts.missingPhone },
        !hasConsent && { step: 2, text: texts.missingConsent },
      ].filter((item) => item !== false);
      if (missing.length > 0) {
        onStep(missing[0].step);
        return setError(fillText(texts.missingToPublish, { items: new Intl.ListFormat(locale).format(missing.map((item) => item.text)) }));
      }
      const result = await describeAdminListing(listing.id, {
        notes,
        sellerPhone: sellerPhone.trim(),
        sellerName,
        textMode,
        hasConsent,
        ...(!isEvent && { isWanted }),
        texts: draft,
        priceMode: isEvent ? 'FIXED' : priceMode,
        price,
      });
      if (!result.success) return setError(result.message);
      onSent({ ...listing, status: 'PROCESSING', rawText: notes, textMode, lastError: null });
    });

  // The AI writes the texts now, in every language; a price the AI read fills an empty one.
  const createDescription = async () => {
    if (!notes.trim()) {
      notesInput.current?.focus();
      return setError(fillText(texts.missingToPublish, { items: texts.missingText }));
    }
    setError('');
    setIsDrafting(true);
    const result = await draftAdminListingText(listing.id, { notes, textMode, ...(!isEvent && { isWanted }), priceMode, price });
    setIsDrafting(false);
    if (!('texts' in result && result.texts)) return setError(result.message);
    setDraft(result.texts);
    setTextLanguage(shopLanguage.id);
    if (!price && result.price && result.priceMode) {
      setPrice(result.price);
      setPriceMode(result.priceMode);
    }
  };

  const retry = () =>
    startTransition(async () => {
      await retryAdminListing(listing.id);
      onSent({ ...listing, lastError: null });
    });

  return (
    <>
      <div className='mx-auto flex w-full max-w-xl flex-col gap-4'>
        {/* What the AI is doing, part by part; nothing here blocks the form. */}
        {isWriting && (
          <ul aria-live='polite' className='flex flex-wrap gap-2 text-sm'>
            <WorkState isDone={hasText} label={hasText ? texts.textReady : isOriginal ? texts.translatingNow : texts.writing} />
          </ul>
        )}

        {step === 1 && !isEvent && (
          <div role='radiogroup' aria-label={texts.typeLabel} className='grid grid-cols-2 gap-1 rounded-full border border-border bg-card p-1'>
            {[false, true].map((wanted) => (
              <button
                key={String(wanted)}
                type='button'
                role='radio'
                aria-checked={isWanted === wanted}
                disabled={isWriting}
                onClick={() => chooseWanted(wanted)}
                className={cn(
                  'min-h-11 rounded-full px-3 py-2 text-sm font-medium transition-colors',
                  isWanted === wanted ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {wanted ? texts.wantedLabel : texts.offerLabel}
              </button>
            ))}
          </div>
        )}

        {step === 1 && (
          <div className='grid grid-cols-2 gap-2'>
            {!isEvent && (
              <div className='space-y-1'>
                <Label htmlFor='price-mode' className='px-1 text-xs text-muted-foreground'>
                  {texts.priceShort}
                </Label>
                <select id='price-mode' value={priceMode} disabled={isWriting} onChange={(event) => setPriceMode(event.target.value as PriceMode)} className={SELECT_CLASS}>
                  {PRICE_MODES.map((mode) => (
                    <option key={mode} value={mode}>
                      {texts[`priceMode_${mode}`]}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {(isEvent || priceMode !== 'NONE') && (
              <div className={cn('space-y-1', isEvent && 'col-span-2')}>
                <Label htmlFor='price' className='px-1 text-xs text-muted-foreground'>
                  {isEvent ? texts.eventPrice : texts.priceAmount}
                </Label>
                <div className='relative'>
                  <Input
                    id='price'
                    inputMode='decimal'
                    value={price}
                    readOnly={isWriting}
                    onChange={(event) => setPrice(event.target.value)}
                    className='h-12 rounded-2xl bg-card pr-8 text-lg font-semibold text-primary md:text-lg'
                  />
                  <span className='absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground'>€</span>
                </div>
              </div>
            )}
          </div>
        )}

        <div hidden={step !== 1} className='space-y-3 rounded-3xl border border-border bg-card p-4 sm:p-5'>
          <div className='flex items-center justify-between gap-3'>
            <Label htmlFor='notes' className='font-display text-xl'>
              {texts.tellLabel}
            </Label>
            {/* Spoken words land in the field, where they can still be corrected before sending. */}
            {!isWriting && <VoiceInputButton onText={(text) => setNotes((current) => (current.trim() ? `${current.trimEnd()} ${text}` : text))} />}
          </div>
          <Textarea
            ref={notesInput}
            id='notes'
            rows={4}
            value={notes}
            readOnly={isWriting}
            onChange={(event) => setNotes(event.target.value)}
            placeholder={placeholder}
            className='field-sizing-content max-h-[40svh] min-h-28 resize-none rounded-2xl bg-background text-base md:text-base'
          />
          <div className='grid gap-2 min-[380px]:grid-cols-[minmax(0,1fr)_auto]'>
            <select
              aria-label={texts.textModeQuestion}
              value={textMode}
              disabled={isWriting || isDrafting}
              onChange={(event) => setTextMode(event.target.value as TextMode)}
              className={SELECT_CLASS}
            >
              {(['ai', 'corrected', 'original'] as const).map((mode) => (
                <option key={mode} value={mode}>
                  {texts[`textModeChoice_${mode}`]}
                </option>
              ))}
            </select>
            <Button className='h-12 rounded-full px-4' disabled={isWriting || isDrafting} onClick={createDescription}>
              {isDrafting ? <Loader2 className='animate-spin' /> : <Sparkles />} {texts.createDescription}
            </Button>
          </div>
        </div>

        {/* Always there, so nothing jumps: usable once "Crear descripción" wrote the texts. */}
        <fieldset
          hidden={step !== 1}
          disabled={!hasDraft || isDrafting || isWriting}
          className='space-y-3 rounded-3xl border border-border bg-card p-4 transition-opacity disabled:opacity-50 sm:p-5'
        >
          <div role='tablist' aria-label={texts.languagesLabel} className='flex flex-wrap gap-1'>
            {textLanguages.map(({ id, label }) => (
              <button
                key={id}
                type='button'
                role='tab'
                aria-selected={id === textLanguage}
                onClick={() => setTextLanguage(id)}
                className={cn(
                  'rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
                  id === textLanguage ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <div className='space-y-1'>
            <Label htmlFor='draft-title' className='px-1 text-xs text-muted-foreground'>
              {texts.titleLabel}
            </Label>
            <Input id='draft-title' value={shownText.title} onChange={(event) => setShownText('title')(event.target.value)} className='h-12 rounded-2xl bg-background text-base md:text-base' />
          </div>
          <div className='space-y-1'>
            <Label htmlFor='draft-description' className='px-1 text-xs text-muted-foreground'>
              {texts.descriptionLabel}
            </Label>
            <Textarea
              id='draft-description'
              rows={4}
              value={shownText.description}
              onChange={(event) => setShownText('description')(event.target.value)}
              className='field-sizing-content max-h-[40svh] min-h-28 resize-none rounded-2xl bg-background text-base md:text-base'
            />
          </div>
        </fieldset>

        {isOnContact && (
          <div className='space-y-4 rounded-3xl border border-border bg-card p-4 sm:p-5'>
            <div className='space-y-2'>
              <Label htmlFor='seller'>{texts.servicePhoneLabel}</Label>
              <Input
                id='seller'
                type='tel'
                value={sellerPhone}
                readOnly={isWriting}
                onChange={(event) => setSellerPhone(event.target.value)}
                placeholder={texts.sellerPlaceholder}
                className='h-12 rounded-2xl bg-background'
              />
              {/* Wanted ads and events have no seller: the number is the person behind them. */}
              <p className='text-xs text-muted-foreground'>{isService || isWanted ? texts.servicePhoneHint : listing.type === 'EVENT' ? texts.eventPhoneHint : texts.sellerHint}</p>
              {isWanted && <p className='text-xs text-muted-foreground'>{texts.wantedContactNote}</p>}
            </div>
            <div className='space-y-2'>
              <Label htmlFor='seller-name'>{texts.sellerNameLabel}</Label>
              <Input
                id='seller-name'
                value={sellerName}
                readOnly={isWriting}
                maxLength={30}
                onChange={(event) => setSellerName(event.target.value)}
                placeholder={texts.sellerNamePlaceholder}
                className='h-12 rounded-2xl bg-background'
              />
              <p className='text-xs text-muted-foreground'>{texts.sellerNameHint}</p>
            </div>
            <Label className='flex items-start gap-3 rounded-2xl border border-border bg-background p-3 text-sm font-normal leading-5'>
              <Checkbox checked={hasConsent} disabled={isWriting} onCheckedChange={(value) => setHasConsent(value === true)} className='mt-0.5' />
              {texts.consentConfirm}
            </Label>
          </div>
        )}

        {(error || listing.lastError) && (
          <div ref={errorBox} role='alert' className='flex items-center justify-between gap-3 rounded-2xl border border-destructive/40 p-3 text-sm text-destructive'>
            <span>{error || aiErrorText(t, listing.lastError) || texts.errorGeneric}</span>
            {listing.lastError && (
              <Button variant='outline' size='sm' className='shrink-0 rounded-full' disabled={isPending} onClick={retry}>
                <RotateCw /> {texts.retry}
              </Button>
            )}
          </div>
        )}

        {/* The end of the setup on every step, so it can be finished from wherever the admin is. Not sticky: on phones a
            floating button jumped over the field with the keyboard open. */}
        <Button size='lg' className='w-full rounded-full shadow-xl shadow-primary/20' disabled={isPending || isWriting} onClick={send}>
          {isPending || isWriting ? <Loader2 className='animate-spin' /> : <Send />}{' '}
          {/* While the AI works, the parts above say what it is doing; the button doesn't repeat them. */}
          {isWriting ? texts.status_PROCESSING : texts.publishButton}
        </Button>
      </div>
    </>
  );
}

interface WorkStateProps {
  isDone: boolean;
  label: string;
}

// Native selects: on a phone they open the system's own picker.
const SELECT_CLASS = 'h-12 w-full rounded-2xl border border-border bg-card px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

/** One part of the AI's work (pictures or text): busy, or done. */
function WorkState({ isDone, label }: WorkStateProps) {
  return (
    <li className='inline-flex min-w-0 items-center gap-2 rounded-full bg-muted px-3 py-1.5'>
      {isDone ? <Check className='size-4 shrink-0 text-primary' aria-hidden /> : <Loader2 className='size-4 shrink-0 animate-spin text-primary' aria-hidden />}
      {label}
    </li>
  );
}
