'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useI18n } from '@/components/i18n-provider';
import { aiErrorText } from '@/lib/ai-errors';
import { CalendarPlus, Check, ChevronDown, Globe, Loader2, Mail, MessageCircle, RotateCw, Save, Send, Sparkles, Trash2, X } from 'lucide-react';
import InstagramIcon from '@/components/shared/icons/instagram-icon';
import VoiceInputButton from '@/components/shared/voice-input-button';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useRouter } from 'next/navigation';
import DeleteDialog from '@/components/shared/delete-dialog';
import {
  deleteAdminListing,
  translateListingText,
  describeAdminListing,
  draftAdminListingText,
  enableAdminListing,
  extendAdminListing,
  getAdminListing,
  hideAdminListing,
  markAdminListingSold,
  publishAdminListing,
  retryAdminListing,
  setAdminListingEnd,
  updateAdminListing,
  type AdminListing,
} from '@/lib/marketplace/admin.actions';
import { adminPreviewSlug } from '@/lib/marketplace/preview-slug';
import { fillText, type AdminTexts } from '@/lib/marketplace/admin-texts';
import { CLEAN_CONTACT, CONTACT_EXTRAS, webLabel, type ContactExtra, type ListingContacts } from '@/lib/marketplace/contact-ways';
import { findPhoneInText } from '@/lib/marketplace/phone-in-text';
import { sellerIdentity } from '@/lib/marketplace/seller';
import type { ListingTexts, TextMode } from '@/lib/marketplace/text-versions';
import { DEFAULT_PRICE_MODES, PRICE_MODES, type PriceMode } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { pictureOf } from '@/lib/video';
import { toShopDateTime } from '@/lib/event-date';
import type { Locale } from '@/lib/i18n-core';
import AddressInput from './address-input';
import TagInput from './tag-input';
import type { EditorLanguage, EditorTag, MercadilloOption, ScoutOption, TagOption } from './editor-types';

interface DescriptionStepProps {
  listing: AdminListing;
  /** The shop's other languages, which the text is translated into. */
  languages: EditorLanguage[];
  /** The shop's own language, the first tab of the texts. */
  shopLanguage: EditorLanguage;
  /** The Mercadillos it can join, on "Más". */
  mercadillos: MercadilloOption[];
  /** The señaladores to pick from, on "Más". */
  scouts: ScoutOption[];
  /** The shop's etiquetas to offer under the texts. */
  tagOptions: TagOption[];
  /** How many etiquetas a listing can have (MAX_LISTING_TAGS). */
  maxTags: number;
  /** How many days a listing stays online by default (LISTING_DAYS). */
  listingDays: number;
  texts: AdminTexts;
  /** The listing as it is after sending: the AI writes it now. */
  /** isForPerson: "Enviar a la persona", the listing waits for their OK instead of going online. */
  onSent: (listing: AdminListing, isForPerson?: boolean) => void;
  /** The step the workspace's bar shows: 0 the pictures (only the finish button here), 1 the description, 2 the contact. */
  step: number;
  /** Opens the step where something is missing. */
  onStep: (step: number) => void;
}

/** Steps 2 and 3: everything the admin knows about the item in one text, then the person's contact; the AI turns it into the listing. */
export default function DescriptionStep({ listing, languages, shopLanguage, mercadillos, scouts, tagOptions, maxTags, listingDays, texts, onSent, step, onStep }: DescriptionStepProps) {
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
  // An existing listing (online, hidden, sold, waiting …) is edited with the same steps and saved, not published.
  const isEditing = listing.status !== 'COLLECTING' && listing.status !== 'PROCESSING';
  const router = useRouter();
  const [sellerPhone, setSellerPhone] = useState(isEditing && /^\d+$/.test(listing.seller.waId) ? `+${listing.seller.waId}` : '');
  // WhatsApp is one way of several: a new listing starts with it, an existing one keeps it only if it has a number.
  const [hasWhatsapp, setHasWhatsapp] = useState(!isEditing || Boolean(sellerPhone));
  const sentPhone = hasWhatsapp ? sellerPhone.trim() : '';
  // "Enviar por WhatsApp" belongs to the contact: only there, with a number, and not while the AI writes.
  const isSendShown = isOnContact && listing.status === 'COLLECTING' && hasWhatsapp;
  // The name visitors see now: only a changed name is saved on the listing.
  const shownSellerName = isEditing ? (sellerIdentity(listing).name ?? '') : '';
  const [sellerName, setSellerName] = useState(shownSellerName);
  // Email, web and Instagram besides the WhatsApp: the ones chosen in "Cómo contactar" get a field.
  const [contacts, setContacts] = useState<ListingContacts>({
    email: listing.contactEmail ?? '',
    web: listing.contactWeb ? webLabel(listing.contactWeb) : '',
    instagram: listing.contactInstagram ? `@${listing.contactInstagram}` : '',
  });
  const [chosenContacts, setChosenContacts] = useState<ContactExtra[]>(() => CONTACT_EXTRAS.filter((kind) => contacts[kind]));
  const [checkedContacts, setCheckedContacts] = useState<ContactExtra[]>([]);
  const toggleContact = (kind: ContactExtra) => setChosenContacts((current) => (current.includes(kind) ? current.filter((chosen) => chosen !== kind) : [...current, kind]));
  const isContactWrong = (kind: ContactExtra) => !CLEAN_CONTACT[kind](contacts[kind]);
  // An unchosen way is saved empty, so taking it away removes it from the listing.
  const sentContacts = () => Object.fromEntries(CONTACT_EXTRAS.map((kind) => [kind, chosenContacts.includes(kind) ? contacts[kind] : ''])) as ListingContacts;
  const descriptionInput = useRef<HTMLTextAreaElement>(null);
  // How "Crear descripción" treats the words: improved, corrected (the default) or only translated; always into every language.
  const [textMode, setTextMode] = useState<TextMode>(listing.title ? (listing.textMode as TextMode) : 'corrected');
  const isOriginal = textMode === 'original';
  // The texts in every language, as the admin writes or edits them; a person's own words (WhatsApp) start in the shop's.
  const textLanguages = [shopLanguage, ...languages];
  const [draft, setDraft] = useState<ListingTexts>(() =>
    listing.title
      ? { ...(listing.translations as ListingTexts), [shopLanguage.id]: { title: listing.title, description: listing.description ?? '', short: listing.shortTitle ?? '' } }
      : listing.rawText
        ? { [shopLanguage.id]: { title: listing.originalTitle ?? '', description: listing.rawText } }
        : {}
  );
  // Complete: a title and a description in every shop language, the AI's or the admin's own.
  const isTextsComplete = (made: ListingTexts) => textLanguages.every(({ id }) => Boolean(made[id]?.title.trim() && made[id]?.description.trim()));
  const ownText = draft[shopLanguage.id];
  const hasOwnText = Boolean(ownText?.title.trim() && ownText?.description.trim());
  const [isDrafting, setIsDrafting] = useState(false);
  const [textLanguage, setTextLanguage] = useState(shopLanguage.id);
  const shownText = draft[textLanguage] ?? { title: '', description: '' };
  const setShownText = (name: 'title' | 'description') => (value: string) =>
    setDraft((current) => ({ ...current, [textLanguage]: { ...(current[textLanguage] ?? { title: '', description: '' }), [name]: value } }));
  // Spoken words land after what is there, where they can still be corrected.
  const addSpokenText = (name: 'title' | 'description') => (text: string) =>
    setDraft((current) => {
      const shown = current[textLanguage] ?? { title: '', description: '' };
      return { ...current, [textLanguage]: { ...shown, [name]: shown[name].trim() ? `${shown[name].trimEnd()} ${text}` : text } };
    });
  // The words the listing is made from: the selected tab's, the base for every other language.
  const notes = shownText.description;
  // Optional: a kind of price and its amount; an event only has its entry.
  const [priceMode, setPriceMode] = useState<PriceMode>(listing.priceMode ?? DEFAULT_PRICE_MODES[listing.type]);
  const [price, setPrice] = useState(listing.price ?? '');
  // An event's date ("2026-11-29T19:00" on the island's clock) and place; "Crear descripción" fills empty ones from the words.
  const [startsAt, setStartsAt] = useState(listing.startsAt ? toShopDateTime(listing.startsAt) : '');
  const [address, setAddress] = useState(listing.address ?? '');
  // "Más": Online goes live on Publicar, Oculto keeps it ready; an Anuncio shows until the end of "Online hasta".
  const [isHidden, setIsHidden] = useState(false);
  const [onlineUntil, setOnlineUntil] = useState(() =>
    toShopDateTime(isEditing && listing.expiresAt ? new Date(listing.expiresAt) : new Date(Date.now() + listingDays * 86_400_000)).slice(0, 10)
  );
  // Editing: the state it should end in, from the ones that fit where it is now.
  const [targetStatus, setTargetStatus] = useState(listing.status);
  const [mercadilloId, setMercadilloId] = useState(listing.mercadilloId ?? '');
  const [scoutId, setScoutId] = useState(listing.scoutId ?? '');
  const [tags, setTags] = useState<EditorTag[]>(() => listing.tags);
  const statusChoices: AdminListing['status'][] = listing.status === 'LIVE' ? ['LIVE', 'HIDDEN', 'SOLD'] : [listing.status, 'LIVE'];
  const statusName = (status: AdminListing['status']) =>
    status === 'SOLD' && listing.type !== 'PRODUCT' ? texts[`status_SOLD_${listing.type}`] : texts[`status_${status}`];
  const willBeLive = isEditing ? targetStatus === 'LIVE' : !isHidden;
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
  const [hasConsent, setHasConsent] = useState(isEditing && Boolean(listing.consentAt));
  // A "missing" message is old news as soon as something is filled in.
  useEffect(() => setError(''), [notes, sellerPhone, hasConsent, startsAt, contacts, chosenContacts]);
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

  const send = (isForPerson = false) =>
    startTransition(async () => {
      setError('');
      // Buyers always write to the person's own WhatsApp ("through the Corral" is parked, #131).
      // Everything missing in one message, and the first step it is on opens.
      // An existing listing has its texts already; the shop's own listings may stay without a WhatsApp (and so need no OK).
      const isHouseListing = isEditing && !/^\d+$/.test(listing.seller.waId);
      const hasPhone = Boolean(sentPhone);
      // Texts: every language set, or the AI fills what's missing from the shop language or from the selected tab.
      const hasSomeText = hasOwnText || Boolean(notes.trim());
      const tellMissing = (missing: ({ step: number; text: string } | false)[]) => {
        const shown = missing.filter((item) => item !== false);
        if (shown.length === 0) return false;
        onStep(shown[0].step);
        const items = new Intl.ListFormat(locale).format(shown.map((item) => item.text));
        setError(fillText(isEditing ? texts.missingToSave : texts.missingToPublish, { items }));
        return true;
      };
      setCheckedContacts([...CONTACT_EXTRAS]);
      if (
        tellMissing([
          hasNoPhoto && { step: 0, text: texts.missingPicture },
          !isTextsComplete(draft) && !hasSomeText && { step: 1, text: texts.missingText },
          hasWhatsapp && !hasPhone && !isHouseListing && { step: 2, text: texts.missingPhone },
          !hasWhatsapp && chosenContacts.length === 0 && !isHouseListing && { step: 2, text: texts.missingContactWay },
          chosenContacts.some(isContactWrong) && { step: 2, text: texts.missingContacts },
          !hasConsent && willBeLive && (hasPhone || !isHouseListing) && { step: 2, text: texts.missingConsent },
        ])
      )
        return;
      const filled = await fillMissingTexts();
      if (!filled) return;
      if (
        tellMissing([
          isEvent && !filled.startsAt && { step: 1, text: texts.missingDate },
        ])
      )
        return;
      if (isEditing) return saveChanges(filled);
      const result = await describeAdminListing(listing.id, {
        notes,
        sellerPhone: sentPhone,
        sellerName,
        contacts: sentContacts(),
        textMode,
        hasConsent,
        ...(!isEvent && { isWanted }),
        texts: filled.texts,
        priceMode: isEvent ? 'FIXED' : priceMode,
        price: filled.price,
        ...(isEvent && { startsAt: filled.startsAt, address }),
        // Sent to the person, it stays ready, not shown, until they give their OK on their page.
        isHidden: isHidden || isForPerson,
        ...(!isEvent && { onlineUntil }),
        mercadilloId,
        scoutId,
        tags,
      });
      if (!result.success) return setError(result.message);
      onSent({ ...listing, status: 'PROCESSING', rawText: notes, textMode, lastError: null }, isForPerson);
    });

  // An existing listing: its texts, price and contact, then the state and the end chosen in "Más"; then its page.
  const saveChanges = async (filled: FilledTexts) => {
    const { [shopLanguage.id]: own, ...others } = filled.texts;
    const saved = await updateAdminListing(listing.id, {
      ...(!isEvent && { type: isWanted ? 'WANTED' : listing.type === 'WANTED' ? 'PRODUCT' : listing.type }),
      title: own?.title ?? '',
      shortTitle: own?.short ?? '',
      description: own?.description ?? '',
      translations: Object.fromEntries(
        Object.entries(others as ListingTexts).map(([id, text]) => [id, { title: text?.title ?? '', description: text?.description ?? '', short: text?.short }])
      ),
      priceMode: isEvent ? 'FIXED' : priceMode,
      price: isEvent ? filled.price || '0' : filled.price,
      images: listing.images.length > 0 ? listing.images : listing.rawImages,
      startsAt: isEvent ? filled.startsAt : '',
      address: isEvent ? address : '',
      textMode,
      mercadilloId,
      scoutId,
      tags,
      sellerPhone: sentPhone,
      ...(sellerName.trim() !== shownSellerName && { sellerName }),
      contacts: sentContacts(),
      hasConsent: hasConsent && !listing.consentAt,
    });
    if (!saved.success) return setError(saved.message);
    const from = listing.status;
    const change =
      targetStatus === from
        ? null
        : targetStatus === 'HIDDEN'
          ? hideAdminListing
          : targetStatus === 'SOLD'
            ? markAdminListingSold
            : from === 'IN_REVIEW' || from === 'AWAITING_PAYMENT'
              ? (id: string) => publishAdminListing(id, 'normal')
              : enableAdminListing;
    const changed = change && (await change(listing.id));
    if (changed && !changed.success) return setError(changed.message);
    if (targetStatus === 'LIVE' && !isEvent) await setAdminListingEnd(listing.id, onlineUntil);
    const next = await getAdminListing(listing.id);
    router.push(next?.status === 'LIVE' && next.product?.slug ? `/product/${next.product.slug}` : `/product/${adminPreviewSlug(listing.id)}`);
  };

  // "Prolongar 1 mes": an online listing's end moves a month on, saved at once.
  const extendMonth = () =>
    startTransition(async () => {
      const result = await extendAdminListing(listing.id);
      if (!result.success) return setError(result.message);
      const next = await getAdminListing(listing.id);
      if (next?.expiresAt) setOnlineUntil(toShopDateTime(new Date(next.expiresAt)).slice(0, 10));
    });

  // No save first: the listing is gone anyway; the dialog shows how it went.
  const deleteAndLeave = async (id: string) => {
    const result = await deleteAdminListing(id);
    if (result.success) router.push('/admin/listings');
    return result;
  };

  // The AI writes the texts now from the selected tab, into every language; a price or etiqueta it read fills an empty one.
  const createDescription = async (): Promise<FilledTexts | null> => {
    if (!notes.trim()) {
      descriptionInput.current?.focus();
      setError(fillText(texts.missingToPublish, { items: texts.missingText }));
      return null;
    }
    setError('');
    setIsDrafting(true);
    const result = await draftAdminListingText(listing.id, {
      notes,
      title: shownText.title,
      language: textLanguage,
      textMode,
      ...(!isEvent && { isWanted }),
      priceMode,
      price,
      ...(isEvent && { startsAt, address }),
    });
    setIsDrafting(false);
    if (!('texts' in result && result.texts)) {
      setError(result.message);
      return null;
    }
    setDraft(result.texts);
    // One existing etiqueta at most, and only one the admin hasn't set: the rest are theirs.
    const picked = tagOptions.find((option) => option.id === result.tag);
    if (picked) setTags((current) => (current.some((tag) => tag.id === picked.id) || current.length >= maxTags ? current : [...current, picked]));
    // What the AI read only fills what the admin left empty.
    const filledPrice = price || (result.price && result.priceMode ? result.price : '');
    if (!price && result.price && result.priceMode) {
      setPrice(result.price);
      setPriceMode(result.priceMode);
    }
    if (!startsAt && result.startsAt) setStartsAt(result.startsAt);
    if (!address && result.address) setAddress(result.address);
    return { texts: result.texts, startsAt: startsAt || result.startsAt || '', price: filledPrice };
  };

  // Publicar / Guardar: every language as it is when complete; else the AI translates the missing ones from the shop
  // language, or writes them all from the selected tab when the shop language has no text yet.
  const fillMissingTexts = async (): Promise<FilledTexts | null> => {
    const current = { texts: draft, startsAt, price };
    if (isTextsComplete(draft)) return current;
    if (!hasOwnText) return createDescription();
    setIsDrafting(true);
    const result = await translateListingText(listing.id, { title: ownText!.title, description: ownText!.description, short: ownText!.short });
    setIsDrafting(false);
    if (!('translations' in result && result.translations)) {
      setError(result.message);
      return null;
    }
    const translated = result.translations as ListingTexts;
    const isSet = (locale: Locale) => Boolean(draft[locale]?.title.trim() && draft[locale]?.description.trim());
    const texts = { ...draft, ...Object.fromEntries(languages.filter(({ id }) => !isSet(id) && translated[id]).map(({ id }) => [id, translated[id]])) };
    setDraft(texts);
    return { ...current, texts };
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

        {/* The only place for the text: one tab per language; the selected tab is the base "Crear descripción" works from. */}
        <fieldset hidden={step !== 1} disabled={isDrafting || isWriting} className='space-y-3 rounded-3xl border border-border bg-card p-4 transition-opacity disabled:opacity-50 sm:p-5'>
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
            <div className='flex items-end justify-between gap-2'>
              <Label htmlFor='draft-title' className='px-1 pb-1 text-xs text-muted-foreground'>
                {texts.titleLabel}
              </Label>
              {!isWriting && <VoiceInputButton language={textLanguage} onText={addSpokenText('title')} className='h-9' />}
            </div>
            <Input id='draft-title' value={shownText.title} onChange={(event) => setShownText('title')(event.target.value)} className='h-12 rounded-2xl bg-background text-base md:text-base' />
          </div>
          <div className='space-y-1'>
            <div className='flex items-end justify-between gap-2'>
              <Label htmlFor='draft-description' className='px-1 pb-1 text-xs text-muted-foreground'>
                {texts.descriptionLabel}
              </Label>
              {!isWriting && <VoiceInputButton language={textLanguage} onText={addSpokenText('description')} className='h-9' />}
            </div>
            <Textarea
              ref={descriptionInput}
              id='draft-description'
              rows={4}
              value={shownText.description}
              onChange={(event) => setShownText('description')(event.target.value)}
              placeholder={placeholder}
              className='field-sizing-content max-h-[40svh] min-h-28 resize-none rounded-2xl bg-background text-base md:text-base'
            />
          </div>
          {/* In the selected tab's language: chosen or made in it, and translated from it. */}
          <div className='space-y-1'>
            <div className='flex items-baseline justify-between gap-2 px-1 text-xs text-muted-foreground'>
              <Label htmlFor='listing-tags' className='text-xs text-muted-foreground'>
                {texts.tagsLabel}
              </Label>
              <span aria-live='polite'>
                {tags.length}/{maxTags}
              </span>
            </div>
            <TagInput
              id='listing-tags'
              value={tags}
              onChange={setTags}
              options={tagOptions}
              language={textLanguage}
              languages={textLanguages.map(({ id }) => id)}
              max={maxTags}
              isDisabled={isWriting}
              texts={texts}
              onError={setError}
            />
          </div>
          <div className='grid grid-cols-[minmax(0,1fr)_auto] gap-2'>
            <select aria-label={texts.textModeQuestion} value={textMode} onChange={(event) => setTextMode(event.target.value as TextMode)} className={cn(SELECT_CLASS, 'bg-background')}>
              {(['ai', 'corrected', 'original'] as const).map((mode) => (
                <option key={mode} value={mode}>
                  {texts[`textModeChoice_${mode}`]}
                </option>
              ))}
            </select>
            <Button className='h-12 rounded-full px-4' onClick={createDescription}>
              {isDrafting ? <Loader2 className='animate-spin' /> : <Sparkles />}
              {/* Phones: the word alone, so the choice next to it stays readable. */}
              <span className='min-[400px]:hidden'>{texts.createShort}</span>
              <span className='max-[399px]:hidden'>{texts.createDescription}</span>
            </Button>
          </div>
        </fieldset>

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

        {step === 1 && isEvent && (
          <div className='grid gap-2 sm:grid-cols-2'>
            {/* The native date and time picker needs the whole width on a phone. */}
            <div className='space-y-1'>
              <Label htmlFor='starts-at' className='px-1 text-xs text-muted-foreground'>
                {texts.eventStartsLabel}
              </Label>
              <Input id='starts-at' type='datetime-local' value={startsAt} readOnly={isWriting} onChange={(event) => setStartsAt(event.target.value)} className='h-12 rounded-2xl bg-card text-base md:text-base' />
            </div>
            <div className='space-y-1'>
              <Label htmlFor='address' className='px-1 text-xs text-muted-foreground'>
                {texts.addressLabel}
              </Label>
              <AddressInput
                id='address'
                value={address}
                onChange={setAddress}
                placeId={listing.placeId ?? ''}
                placeholder={texts.addressPlaceholder}
                className='h-12 rounded-2xl bg-card text-base md:text-base'
              />
            </div>
          </div>
        )}

        {isOnContact && (
          <div className='space-y-4 rounded-3xl border border-border bg-card p-4 sm:p-5'>
            <ContactWaysPicker
              texts={texts}
              chosen={chosenContacts}
              hasWhatsapp={hasWhatsapp}
              isDisabled={isWriting}
              onToggle={toggleContact}
              onToggleWhatsapp={() => setHasWhatsapp((current) => !current)}
            />
            {hasWhatsapp && (
              <div className='space-y-2'>
                <Label htmlFor='seller' className='flex items-center gap-2'>
                  <MessageCircle className='size-4 text-muted-foreground' /> {texts.servicePhoneLabel}
                </Label>
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
            )}
            {CONTACT_EXTRAS.filter((kind) => chosenContacts.includes(kind)).map((kind) => (
              <ContactField
                key={kind}
                kind={kind}
                texts={texts}
                value={contacts[kind]}
                isWrong={checkedContacts.includes(kind) && isContactWrong(kind)}
                isDisabled={isWriting}
                onChange={(value) => setContacts((current) => ({ ...current, [kind]: value }))}
                onBlur={() => setCheckedContacts((current) => [...current, kind])}
                onRemove={() => toggleContact(kind)}
              />
            ))}
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

        {step === 3 && (
          <div className='space-y-4 rounded-3xl border border-border bg-card p-4 sm:p-5'>
            <div className='space-y-1'>
              <Label htmlFor='listing-state' className='px-1 text-xs text-muted-foreground'>
                {texts.statusLabel}
              </Label>
              {isEditing ? (
                <select id='listing-state' value={targetStatus} onChange={(event) => setTargetStatus(event.target.value as AdminListing['status'])} className={SELECT_CLASS}>
                  {statusChoices.map((status) => (
                    <option key={status} value={status}>
                      {statusName(status)}
                    </option>
                  ))}
                </select>
              ) : (
                <select id='listing-state' value={isHidden ? 'HIDDEN' : 'LIVE'} disabled={isWriting} onChange={(event) => setIsHidden(event.target.value === 'HIDDEN')} className={SELECT_CLASS}>
                  <option value='LIVE'>{texts.status_LIVE}</option>
                  <option value='HIDDEN'>{texts.status_HIDDEN}</option>
                </select>
              )}
            </div>
            <div className='space-y-1'>
              <Label htmlFor='online-until' className='px-1 text-xs text-muted-foreground'>
                {texts.onlineUntilLabel}
              </Label>
              {/* An event stays until its day is over: the date set in Descripción, shown here but changed only there. */}
              {isEvent ? (
                <>
                  <Input id='online-until' type='date' value={startsAt.slice(0, 10)} disabled className='h-12 rounded-2xl bg-background text-base md:text-base' />
                  <p className='px-1 text-xs text-muted-foreground'>{texts.eventDateFromDescription}</p>
                </>
              ) : (
                <Input id='online-until' type='date' value={onlineUntil} readOnly={isWriting} onChange={(event) => setOnlineUntil(event.target.value)} className='h-12 rounded-2xl bg-background text-base md:text-base' />
              )}
              {isEditing && listing.status === 'LIVE' && !isEvent && (
                <Button variant='outline' className='mt-2 w-full rounded-full' disabled={isPending} onClick={extendMonth}>
                  <CalendarPlus /> {texts.extendMonth}
                </Button>
              )}
            </div>
            {mercadillos.length > 0 && (
              <div className='space-y-1'>
                <Label htmlFor='listing-mercadillo' className='px-1 text-xs text-muted-foreground'>
                  {texts.mercadilloLabel}
                </Label>
                <select id='listing-mercadillo' value={mercadilloId} disabled={isWriting} onChange={(event) => setMercadilloId(event.target.value)} className={SELECT_CLASS}>
                  <option value=''>{texts.mercadilloNone}</option>
                  {mercadillos.map((mercadillo) => (
                    <option key={mercadillo.id} value={mercadillo.id}>
                      {mercadillo.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {scouts.length > 0 && (
              <div className='space-y-1'>
                <Label htmlFor='listing-scout' className='px-1 text-xs text-muted-foreground'>
                  {texts.scoutLabel}
                </Label>
                <select id='listing-scout' value={scoutId} disabled={isWriting} onChange={(event) => setScoutId(event.target.value)} className={SELECT_CLASS}>
                  <option value=''>{texts.scoutNone}</option>
                  {scouts.map((scout) => (
                    <option key={scout.id} value={scout.id}>
                      {scout.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {step === 3 && isEditing && (
          <DeleteDialog
            id={listing.id}
            action={deleteAndLeave}
            description={texts.deleteHint}
            trigger={
              <Button variant='outline' className='w-full rounded-full border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive'>
                <Trash2 /> {texts.deleteListing}
              </Button>
            }
          />
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
        <div className='grid gap-3 sm:grid-cols-2'>
          {/* Only on Contacto, next to the number it goes to: the person sees their listing first and gives their OK on
              their private page, instead of it going online. */}
          {isSendShown && (
            <Button size='lg' variant='outline' className='w-full rounded-full' disabled={isPending} onClick={() => send(true)}>
              <MessageCircle /> {texts.sendWhatsApp}
            </Button>
          )}
          <Button size='lg' className={cn('w-full rounded-full shadow-xl shadow-primary/20', !isSendShown && 'sm:col-span-2')} disabled={isPending || isWriting} onClick={() => send()}>
              {isPending || isWriting ? <Loader2 className='animate-spin' /> : isEditing ? <Save /> : <Send />}{' '}
            {/* While the AI works, the parts above say what it is doing; the button doesn't repeat them. */}
            {isWriting ? texts.status_PROCESSING : isEditing ? texts.saveChanges : isHidden ? texts.saveHidden : texts.publishButton}
          </Button>
        </div>
      </div>
    </>
  );
}

interface WorkStateProps {
  isDone: boolean;
  label: string;
}

const CONTACT_ICONS = { whatsapp: MessageCircle, email: Mail, web: Globe, instagram: InstagramIcon };

const contactTexts = (texts: AdminTexts, kind: ContactExtra) =>
  ({
    email: { label: texts.contactEmailLabel, placeholder: texts.contactEmailPlaceholder, invalid: texts.contactEmailInvalid, type: 'email' },
    web: { label: texts.contactWebLabel, placeholder: texts.contactWebPlaceholder, invalid: texts.contactWebInvalid, type: 'url' },
    instagram: { label: texts.contactInstagramLabel, placeholder: texts.contactInstagramPlaceholder, invalid: texts.contactInstagramInvalid, type: 'text' },
  })[kind];

interface ContactWaysPickerProps {
  texts: AdminTexts;
  chosen: ContactExtra[];
  hasWhatsapp: boolean;
  isDisabled: boolean;
  onToggle: (kind: ContactExtra) => void;
  onToggleWhatsapp: () => void;
}

/** "Cómo contactar a la persona": any of WhatsApp, email, web and Instagram; nobody has to give their WhatsApp. */
function ContactWaysPicker({ texts, chosen, hasWhatsapp, isDisabled, onToggle, onToggleWhatsapp }: ContactWaysPickerProps) {
  const ways = [...(hasWhatsapp ? ['whatsapp' as const] : []), ...CONTACT_EXTRAS.filter((kind) => chosen.includes(kind))];
  const labelOf = (kind: (typeof ways)[number]) => (kind === 'whatsapp' ? 'WhatsApp' : contactTexts(texts, kind).label);
  return (
    <div className='space-y-2'>
      <Label>{texts.contactWaysLabel}</Label>
      <DropdownMenu>
        <DropdownMenuTrigger asChild disabled={isDisabled}>
          <button type='button' className='flex h-12 w-full items-center gap-2 rounded-2xl border border-input bg-background px-3 text-left text-sm'>
            <span className='flex min-w-0 flex-1 items-center gap-2'>
              {ways.length === 0 && <span className='text-muted-foreground first-letter:uppercase'>{texts.missingContactWay}</span>}
              {ways.map((kind) => {
                const Icon = CONTACT_ICONS[kind];
                return (
                  <span key={kind} className='inline-flex shrink-0 items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs'>
                    <Icon className='size-3.5' />
                    {/* Several names don't fit a phone: then only the icons. */}
                    <span className={cn(ways.length > 2 && 'max-sm:sr-only')}>{labelOf(kind)}</span>
                  </span>
                );
              })}
            </span>
            <ChevronDown className='size-4 shrink-0 text-muted-foreground' />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='start' className='w-[var(--radix-dropdown-menu-trigger-width)]'>
          <DropdownMenuCheckboxItem checked={hasWhatsapp} onCheckedChange={onToggleWhatsapp} onSelect={(event) => event.preventDefault()} className='gap-2'>
            <MessageCircle className='size-4' /> WhatsApp
          </DropdownMenuCheckboxItem>
          {CONTACT_EXTRAS.map((kind) => {
            const Icon = CONTACT_ICONS[kind];
            return (
              <DropdownMenuCheckboxItem key={kind} checked={chosen.includes(kind)} onCheckedChange={() => onToggle(kind)} onSelect={(event) => event.preventDefault()} className='gap-2'>
                <Icon className='size-4' /> {contactTexts(texts, kind).label}
              </DropdownMenuCheckboxItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

interface ContactFieldProps {
  kind: ContactExtra;
  texts: AdminTexts;
  value: string;
  isWrong: boolean;
  isDisabled: boolean;
  onChange: (value: string) => void;
  onBlur: () => void;
  onRemove: () => void;
}

function ContactField({ kind, texts, value, isWrong, isDisabled, onChange, onBlur, onRemove }: ContactFieldProps) {
  const { label, placeholder, invalid, type } = contactTexts(texts, kind);
  const Icon = CONTACT_ICONS[kind];
  return (
    <div className='space-y-2'>
      <Label htmlFor={`contact-${kind}`} className='flex items-center gap-2'>
        <Icon className='size-4 text-muted-foreground' /> {label}
      </Label>
      <div className='flex items-center gap-2'>
        <Input
          id={`contact-${kind}`}
          type={type}
          value={value}
          readOnly={isDisabled}
          placeholder={placeholder}
          aria-invalid={isWrong}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          className={cn('h-12 rounded-2xl bg-background', isWrong && 'border-destructive')}
        />
        <Button type='button' variant='ghost' size='icon' disabled={isDisabled} onClick={onRemove} className='shrink-0 rounded-full' aria-label={fillText(texts.contactRemove, { name: label })}>
          <X />
        </Button>
      </div>
      {isWrong && <p className='text-xs text-destructive'>{invalid}</p>}
    </div>
  );
}

// Native selects: on a phone they open the system's own picker.
const SELECT_CLASS = 'h-12 w-full rounded-2xl border border-border bg-card px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

/** The texts in every language and what goes with them, after the AI filled what was missing. */
interface FilledTexts {
  texts: ListingTexts;
  startsAt: string;
  price: string;
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
