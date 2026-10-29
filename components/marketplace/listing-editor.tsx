'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CalendarPlus, Camera, CheckCircle2, Circle, CircleDot, ExternalLink, ImageIcon, Languages, Loader2, MessageCircle, Plus, RotateCcw, Save, Sparkles, Star, WandSparkles, X } from 'lucide-react';
import ProductMedia from '@/components/ProductMedia';
import ImageLightbox from '@/components/shared/image-lightbox';
import { ANY_CONDITION, newListingPath, PRODUCT_CONDITIONS, SERVICE_TYPES, type ProductCondition, type ServiceType } from '@/lib/constants';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useI18n } from '@/components/i18n-provider';
import { useToast } from '@/hooks/use-toast';
import {
  addAdminVideoStill,
  chooseListingText,
  createAdminListingPicture,
  enableAdminListing,
  extendAdminListing,
  fillAdminListingFields,
  markAdminListingSold,
  publishAdminListing,
  rejectAdminListing,
  shareAdminListing,
  translateListingText,
  updateAdminListing,
  type AdminListing,
} from '@/lib/marketplace/admin.actions';
import { markListingPaid, recordWhatsAppConsent } from '@/lib/marketplace/payment.actions';
import { fillText, markSoldText, type AdminTexts } from '@/lib/marketplace/admin-texts';
import type { ListingTranslations } from '@/lib/marketplace/catalog';
import { fieldState, fillEmptyFields, type FillableField } from '@/lib/marketplace/listing-fields';
import { isAiPicture as isAiPictureAt, pictureCounterpart } from '@/lib/marketplace/pictures';
import type { ListingTexts, TextMode } from '@/lib/marketplace/text-versions';
import { LOCALES, type Locale } from '@/lib/i18n-core';
import { SHOP_TIME_ZONE } from '@/lib/constants/currency';
import { toShopDateTime } from '@/lib/event-date';
import { cn } from '@/lib/utils';
import { isVideoUrl, pictureOf, videoPoster } from '@/lib/video';
import AddressInput from './address-input';
import ListingStatus, { type SaveState } from './listing-status';
import PaymentPanel, { type AdminPayMethod } from './payment-panel';
import PhotoUpload from './photo-upload';
import TextModeSwitch from './text-mode-switch';

/** A shop language, with its short label for the tabs (ES, EN, IT). */
export interface EditorLanguage {
  id: Locale;
  label: string;
}

/** A place as the editor offers it: its id and its name in the admin's language. */
export interface PlaceOption {
  id: string;
  name: string;
}

/** A store category as the editor offers it: its slug and its name in the admin's language. */
export interface CategoryOption {
  slug: string;
  name: string;
}

interface ListingEditorProps {
  listing: AdminListing;
  categories: CategoryOption[];
  /** The live places, plus the listing's own if it isn't live; empty in a shop without places. */
  places: PlaceOption[];
  /** The shop's other languages, each with its own title and description. */
  languages: EditorLanguage[];
  /** The shop's own language: the listing's title and description. */
  shopLanguage: EditorLanguage;
  texts: AdminTexts;
  /** Called once "Publish now" worked, so the workspace can show the done moment. */
  onPublished: () => void;
}

type Plan = 'normal' | 'big';

interface EditorFields {
  title: string;
  /** The few words the store's ring row shows; empty: the title. */
  shortTitle: string;
  description: string;
  translations: Record<string, { title: string; description: string; short: string }>;
  category: string;
  price: string;
  priceMax: string;
  condition: ProductCondition | '';
  placeId: string;
  serviceType: ServiceType | '';
  /** An event's start as the island's clock shows it ("2026-11-29T19:00"). */
  startsAt: string;
  address: string;
  /** The person's WhatsApp; empty: buyers write to the shop's WhatsApp. */
  sellerPhone: string;
  /** "Ofrecido por …"; empty: their WhatsApp name. */
  sellerName: string;
  /** The language buyers write to them in; empty: their number's. */
  sellerLocale: Locale | '';
}

// A service sends no condition and no budget range: it never has either. textMode says which of the two texts this is.
const toEdit = ({ priceMax, condition, ...fields }: EditorFields, images: string[], isService: boolean, textMode: TextMode) =>
  isService ? { ...fields, images, textMode } : { ...fields, priceMax, condition, images, textMode };

const FIELD_CLASS = 'rounded-2xl bg-background text-base md:text-base';
const LABEL_CLASS = 'px-1 text-xs text-muted-foreground';
// Native selects: on a phone they open the system's own picker.
const SELECT_CLASS = 'h-12 w-full rounded-2xl border border-border bg-card px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
// What editSchema takes (images max 12).
const MAX_PICTURES = 12;

/** Everything the AI made, compact enough for a phone screen, editable, with the ways to put it online. */
export default function ListingEditor({ listing, categories, places, languages, shopLanguage, texts, onPublished }: ListingEditorProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { locale } = useI18n();
  const [isPending, startTransition] = useTransition();
  const [images, setImages] = useState(listing.images.length > 0 ? listing.images : listing.rawImages);
  // The picture open full screen, to judge it before choosing original or AI.
  const [viewedIndex, setViewedIndex] = useState<number | null>(null);
  // "Create picture with AI": open with what it should show, and busy while the AI makes it.
  const [isAskingPicture, setIsAskingPicture] = useState(false);
  const [picturePrompt, setPicturePrompt] = useState('');
  const [isMakingPicture, setIsMakingPicture] = useState(false);
  // "Fill what's missing": busy while the AI reads the description; the fields it filled show where they came from.
  const [isFillingFields, setIsFillingFields] = useState(false);
  const [filledFromText, setFilledFromText] = useState<FillableField[]>([]);
  // The video whose still frame the server is taking right now.
  const [stillVideo, setStillVideo] = useState<string | null>(null);
  const [fields, setFields] = useState({
    title: listing.title ?? '',
    shortTitle: listing.shortTitle ?? '',
    description: listing.description ?? '',
    translations: Object.fromEntries(
      languages.map(({ id }) => {
        const text = (listing.translations as ListingTranslations)[id];
        return [id, { title: text?.title ?? '', description: text?.description ?? '', short: text?.short ?? '' }];
      })
    ),
    category: listing.category ?? '',
    // An event starts out free: 0 is its entry until the admin names one.
    price: listing.price ?? (listing.type === 'EVENT' ? '0' : ''),
    priceMax: listing.priceMax ?? '',
    // An unknown value from older data counts as none.
    condition: (PRODUCT_CONDITIONS.includes(listing.condition as ProductCondition) ? listing.condition : '') as ProductCondition | '',
    placeId: listing.placeId ?? '',
    serviceType: (SERVICE_TYPES.includes(listing.serviceType as ServiceType) ? listing.serviceType : '') as ServiceType | '',
    startsAt: listing.startsAt ? toShopDateTime(listing.startsAt) : '',
    address: listing.address ?? '',
    sellerPhone: /^\d+$/.test(listing.seller.waId) ? listing.seller.waId : '',
    sellerName: listing.sellerName ?? '',
    sellerLocale: (LOCALES.some(({ id }) => id === listing.sellerLocale) ? listing.sellerLocale : '') as Locale | '',
  });
  const [language, setLanguage] = useState<Locale>(shopLanguage.id);
  const [plan, setPlan] = useState<Plan>((listing.plan as Plan) ?? 'normal');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [error, setError] = useState('');
  const [textMode, setTextMode] = useState<TextMode>(listing.textMode as TextMode);
  // What the AI is doing to the text right now: writing a version, or translating.
  const [textWork, setTextWork] = useState<TextMode | 'translate' | null>(null);
  // The shop-language text changed after the translations were made.
  const [isTranslationStale, setIsTranslationStale] = useState(false);
  // Only text the admin (or seller) wrote can be used as it is.
  const hasOriginalText = listing.rawText.trim() !== '';
  // What the server has: edits only save on the Save button (or an action), never by themselves.
  const savedSnapshot = useRef(JSON.stringify({ ...fields, images }));
  // A service has a "from" price and no condition.
  const isService = listing.type === 'SERVICE';
  // An event has its entry price (0: free), a date and an address.
  const isEvent = listing.type === 'EVENT';
  // A wanted ad's price is a budget range, and it may take any condition.
  const isWanted = listing.type === 'WANTED';
  const isOpen = listing.status === 'IN_REVIEW' || listing.status === 'AWAITING_PAYMENT';
  // Listings made without the person's WhatsApp belong to the house: nobody to send them to.
  const hasPersonWhatsApp = /^\d+$/.test(listing.seller.waId);
  const isAwaitingPayment = listing.status === 'AWAITING_PAYMENT';
  const isShopLanguage = language === shopLanguage.id;
  const text = isShopLanguage ? { title: fields.title, description: fields.description, short: fields.shortTitle } : fields.translations[language];

  // A field changed by hand no longer counts as filled from the description.
  const set = (name: FillableField | 'sellerPhone' | 'sellerName' | 'sellerLocale') => (event: { target: { value: string } }) => {
    setFilledFromText((current) => current.filter((field) => field !== name));
    setFields((current) => ({ ...current, [name]: event.target.value }));
  };
  // Set, filled from the description, missing, or missing and needed to publish.
  const stateOf = (name: FillableField) => {
    const state = fieldState(name, fields[name], listing.type);
    return state === 'set' && filledFromText.includes(name) ? 'fromText' : state;
  };
  // The shop language is the listing's own title and description; the others are its translations.
  const setText = (name: 'title' | 'description' | 'short') => (event: { target: { value: string } }) => {
    if (isShopLanguage && languages.length > 0) setIsTranslationStale(true);
    setFields((current) =>
      isShopLanguage
        ? { ...current, [name === 'short' ? 'shortTitle' : name]: event.target.value }
        : { ...current, translations: { ...current.translations, [language]: { ...current.translations[language], [name]: event.target.value } } }
    );
  };
  // Every other language from the AI's texts; a language it left out keeps what it had.
  const withTranslations = (current: EditorFields, made: ListingTexts): EditorFields => ({
    ...current,
    translations: Object.fromEntries(
      languages.map(({ id }) => [id, made[id] ? { title: made[id].title, description: made[id].description, short: made[id].short ?? '' } : current.translations[id]])
    ),
  });
  const makeMain = (url: string) => setImages((current) => [url, ...current.filter((image) => image !== url)]);
  const removePicture = (url: string) => setImages((current) => current.filter((image) => image !== url));

  const isDirty = JSON.stringify({ ...fields, images }) !== savedSnapshot.current;

  // The save bar's button: the only way plain edits reach the shop.
  const saveNow = async () => {
    const snapshot = JSON.stringify({ ...fields, images });
    setSaveState('saving');
    const saved = await updateAdminListing(listing.id, toEdit(fields, images, isService, textMode));
    if (saved.success) savedSnapshot.current = snapshot;
    setSaveState(saved.success ? 'saved' : 'failed');
    setError(saved.success ? '' : saved.message);
  };

  // Leaving with a change not saved yet asks first.
  const hasUnsaved = isDirty || saveState === 'saving' || saveState === 'failed';
  useEffect(() => {
    if (!hasUnsaved) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [hasUnsaved]);
  const saveLabel = {
    saving: texts.saving,
    failed: texts.notSaved,
    unsaved: texts.unsavedChanges,
    saved: listing.status === 'LIVE' ? texts.savedLive : texts.savedDraft,
    idle: listing.status === 'LIVE' ? texts.savedLive : texts.savedDraft,
  }[isDirty && saveState !== 'saving' && saveState !== 'failed' ? 'unsaved' : saveState];

  // Every action saves the edits first, so what goes online is what the admin sees.
  // The new picture joins the others and is stored with the next save, like any added photo.
  const makePicture = async () => {
    setIsMakingPicture(true);
    const result = await createAdminListingPicture(listing.id, picturePrompt.trim() || undefined, { title: fields.title, description: fields.description });
    setIsMakingPicture(false);
    if (!('url' in result && result.url)) return toast({ variant: 'destructive', description: result.message });
    setImages((current) => [...current, result.url]);
    setPicturePrompt('');
    setIsAskingPicture(false);
  };

  // The video with its still joins the others with the next save; the stored pairs already have it.
  const addStill = async (url: string) => {
    setStillVideo(url);
    const result = await addAdminVideoStill(listing.id, url);
    setStillVideo(null);
    if (!('url' in result && result.url)) return toast({ variant: 'destructive', description: result.message });
    swapPicture(url, result.url);
    router.refresh();
  };

  const run = (action: () => Promise<{ success: boolean; message: string }>, onSuccess?: () => void) =>
    startTransition(async () => {
      setError('');
      // A thrown action error would replace the whole page (and the edits) with Next's error screen.
      try {
        const saved = await updateAdminListing(listing.id, toEdit(fields, images, isService, textMode));
        if (!saved.success) return setError(saved.message);
        savedSnapshot.current = JSON.stringify({ ...fields, images });
        const result = await action();
        if (!result.success) return setError(result.message);
        if (onSuccess) onSuccess();
        else toast({ description: result.message });
      } catch {
        setError(texts.errorGeneric);
      }
      router.refresh();
    });

  const publish = () => run(() => publishAdminListing(listing.id, plan), onPublished);

  // The tab opens on the click itself: one opened after the save and the action would be blocked as a pop-up.
  const sendByWhatsApp = () => {
    const tab = window.open('', '_blank');
    run(
      async () => {
        const result = await shareAdminListing(listing.id);
        if (result.success && 'url' in result && result.url) {
          if (tab) tab.location.href = result.url;
          else window.location.assign(result.url);
        } else tab?.close();
        return result;
      },
      () => {}
    );
  };

  const markPaid = (method: AdminPayMethod, amount: string) => run(() => markListingPaid(listing.id, { plan, method, amount }), onPublished);

  // The edits so far stay with the current text; the other one comes back as it was, or is made once.
  const switchText = async (mode: TextMode) => {
    setError('');
    setTextWork(mode);
    await updateAdminListing(listing.id, toEdit(fields, images, isService, textMode));
    const result = await chooseListingText(listing.id, mode);
    setTextWork(null);
    if (!('texts' in result && result.texts)) return setError(result.message);
    const own = result.texts[shopLanguage.id];
    setTextMode(mode);
    setFields((current) => ({ ...withTranslations(current, result.texts), title: own?.title ?? '', shortTitle: own?.short ?? '', description: own?.description ?? '' }));
    setIsTranslationStale(false);
  };

  const updateTranslations = async () => {
    setError('');
    setTextWork('translate');
    const result = await translateListingText(listing.id, { title: fields.title, description: fields.description, short: fields.shortTitle });
    setTextWork(null);
    if (!('translations' in result && result.translations)) return setError(result.message);
    setFields((current) => withTranslations(current, result.translations));
    setIsTranslationStale(false);
  };

  const fieldLabels: Record<FillableField, string> = {
    category: texts.categoryLabel,
    price: isService ? texts.priceFrom : isEvent ? texts.eventPrice : isWanted ? texts.budgetFrom : texts.priceShort,
    priceMax: texts.budgetTo,
    condition: texts.conditionLabel,
    serviceType: texts.serviceTypeLabel,
    startsAt: texts.eventStartsLabel,
    address: texts.addressLabel,
    placeId: texts.placeLabel,
  };

  // Only empty fields take what the description says; the admin's own values stay.
  const fillFromDescription = async () => {
    setError('');
    setIsFillingFields(true);
    const result = await fillAdminListingFields(listing.id, { title: fields.title, description: fields.description });
    setIsFillingFields(false);
    if (!('fields' in result && result.fields)) return setError(result.message);
    const { fields: filledFields, filled } = fillEmptyFields(fields, result.fields, listing.type);
    setFields(filledFields);
    setFilledFromText((current) => [...current, ...filled]);
    toast({ description: filled.length > 0 ? fillText(texts.fieldsFilled, { fields: filled.map((name) => fieldLabels[name]).join(', ') }) : texts.fieldsNothingNew });
  };

  // The AI never invents a picture: it needs words (typed here or the description) or an uploaded photo.
  const hasPictureSource = picturePrompt.trim() !== '' || fields.description.trim() !== '' || listing.rawImages.some(pictureOf);

  const swapPicture = (url: string, other: string) => setImages((current) => current.map((image) => (image === url ? other : image)));

  return (
    <div className='mx-auto w-full max-w-xl space-y-4'>
      <ListingStatus status={listing.status} type={listing.type} saveState={saveState} texts={texts} />
      {listing.status === 'EXPIRED' && (
        <div className='space-y-1'>
          <Button className='h-12 w-full rounded-full' disabled={isPending} onClick={() => run(() => enableAdminListing(listing.id))}>
            {isPending ? <Loader2 className='animate-spin' /> : <RotateCcw />} {texts.enableAgain}
          </Button>
          <p className='text-center text-xs text-muted-foreground'>{texts.enableAgainHint}</p>
        </div>
      )}
      {listing.status === 'LIVE' && (
        <div className='flex flex-wrap gap-3'>
          {listing.product && (
            <Button asChild className='rounded-full'>
              <Link href={`/product/${listing.product.slug}`} target='_blank'>
                <ExternalLink /> {texts.viewListing}
              </Link>
            </Button>
          )}
          <Button asChild variant='outline' className='rounded-full'>
            <Link href={newListingPath(listing.type)}>
              <Plus /> {texts.newAnother}
            </Link>
          </Button>
          {/* Selling takes the listing out of the shop at once, so it asks first. */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant='ghost' className='rounded-full' disabled={isPending}>
                {markSoldText(texts, listing.type)}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{markSoldText(texts, listing.type)}</AlertDialogTitle>
                <AlertDialogDescription>{texts.markSoldConfirm}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{texts.markSoldCancel}</AlertDialogCancel>
                <AlertDialogAction className={buttonVariants({ variant: 'destructive' })} onClick={() => run(() => markAdminListingSold(listing.id))}>
                  {markSoldText(texts, listing.type)}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      {/* The main picture a bit bigger; a tap opens a picture full screen, the star makes it the main one. Under each, original or AI. */}
      <ul className='flex items-start gap-3 overflow-x-auto p-1'>
        {images.map((url, index) => {
          const counterpart = pictureCounterpart(listing, url);
          const isAiPicture = isAiPictureAt(listing, url, index);
          return (
            <li key={`${index}-${url}`} className={cn('flex shrink-0 flex-col items-center gap-1.5', index > 0 && 'pt-8')}>
              <div className='relative'>
                <button
                  type='button'
                  onClick={() => setViewedIndex(index)}
                  aria-label={`${texts.photosLabel} ${index + 1}`}
                  className={cn(
                    'relative block cursor-zoom-in overflow-hidden rounded-2xl border-2 bg-muted transition-transform hover:scale-[1.03]',
                    index === 0 ? 'size-32 border-primary' : 'size-24 border-transparent'
                  )}
                >
                  <ProductMedia src={url} alt='' fill sizes='8rem' />
                  {isAiPicture && (
                    <Sparkles className='absolute left-1.5 top-1.5 size-5 rounded-full bg-background/90 p-1 text-primary' aria-label={texts.aiPicture} />
                  )}
                </button>
                {/* A video is the cover only with a still frame for cards and messages. */}
                {(!isVideoUrl(url) || videoPoster(url)) && (
                  <button
                    type='button'
                    onClick={() => index > 0 && makeMain(url)}
                    aria-label={index === 0 ? texts.mainPhoto : texts.makeMain}
                    aria-pressed={index === 0}
                    title={index === 0 ? texts.mainPhoto : texts.makeMain}
                    className={cn(
                      'absolute right-1.5 top-1.5 flex size-7 items-center justify-center rounded-full bg-background/90 shadow transition-colors',
                      index === 0 ? 'text-primary' : 'text-muted-foreground hover:text-primary'
                    )}
                  >
                    <Star className={cn('size-4', index === 0 && 'fill-current')} />
                  </button>
                )}
                {/* The last picture stays: a listing needs at least one. */}
                {images.length > 1 && (
                  <button
                    type='button'
                    onClick={() => removePicture(url)}
                    aria-label={texts.removePhoto}
                    title={texts.removePhoto}
                    className='absolute bottom-1.5 right-1.5 flex size-7 items-center justify-center rounded-full bg-background/90 shadow transition-colors hover:bg-destructive hover:text-destructive-foreground'
                  >
                    <X className='size-4' />
                  </button>
                )}
              </div>
              {isVideoUrl(url) && !videoPoster(url) && (
                <button
                  type='button'
                  onClick={() => addStill(url)}
                  disabled={stillVideo !== null}
                  title={texts.noStill}
                  className='flex h-7 items-center gap-1 rounded-full bg-muted px-2.5 text-xs font-medium text-primary transition hover:bg-accent disabled:opacity-60'
                >
                  {stillVideo === url ? <Loader2 className='size-3.5 animate-spin' aria-hidden /> : <ImageIcon className='size-3.5' aria-hidden />}
                  {stillVideo === url ? texts.chooseStillWorking : texts.chooseStill}
                  <span className='sr-only'>{texts.noStill}</span>
                </button>
              )}
              {counterpart && (
                <div role='radiogroup' aria-label={texts.photosLabel} className='flex rounded-full bg-muted p-0.5'>
                  {[
                    { isAi: false, icon: Camera, label: texts.useOriginalPicture, short: texts.original },
                    { isAi: true, icon: Sparkles, label: texts.useAiPicture, short: texts.aiPicture },
                  ].map(({ isAi, icon: Icon, label, short }) => {
                    const isChecked = isAi === counterpart.isAi;
                    return (
                      <button
                        key={label}
                        type='button'
                        role='radio'
                        aria-checked={isChecked}
                        aria-label={label}
                        title={label}
                        onClick={() => !isChecked && swapPicture(url, counterpart.other)}
                        className={cn(
                          'flex h-7 items-center gap-1 rounded-full px-2 text-xs font-medium transition',
                          isChecked ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'
                        )}
                      >
                        <Icon className='size-3.5' aria-hidden /> {short}
                      </button>
                    );
                  })}
                </div>
              )}
            </li>
          );
        })}
        {images.length < MAX_PICTURES && (
          <li className='shrink-0 pt-8'>
            <button
              type='button'
              onClick={() => setIsAskingPicture((current) => !current)}
              aria-expanded={isAskingPicture}
              className='flex size-24 flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-border p-2 text-center text-xs text-muted-foreground transition hover:border-primary hover:text-primary'
            >
              {isMakingPicture ? <Loader2 className='size-5 animate-spin text-primary' /> : <Sparkles className='size-5' />}
              {isMakingPicture ? texts.newPictureWorking : texts.newPicture}
            </button>
          </li>
        )}
      </ul>
      {isAskingPicture && (
        <div className='flex flex-wrap gap-2'>
          <Input
            value={picturePrompt}
            onChange={(event) => setPicturePrompt(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && !isMakingPicture && hasPictureSource && makePicture()}
            placeholder={texts.newPicturePlaceholder}
            aria-label={texts.newPicture}
            maxLength={500}
            disabled={isMakingPicture}
            className='h-11 min-w-48 flex-1 rounded-full bg-card'
          />
          <Button className='h-11 shrink-0 rounded-full' disabled={isMakingPicture || !hasPictureSource} onClick={makePicture}>
            {isMakingPicture ? <Loader2 className='animate-spin' /> : <Sparkles />} {texts.newPicture}
          </Button>
        </div>
      )}
      {isAskingPicture && !hasPictureSource && <p className='px-3 text-xs text-muted-foreground'>{texts.pictureNeedsText}</p>}
      <ImageLightbox images={images} alt={texts.photosLabel} index={viewedIndex} onIndexChange={setViewedIndex} />

      <section className='relative space-y-2 rounded-3xl border border-border bg-card p-3 sm:p-4'>
        {hasOriginalText && (
          <div className='flex flex-wrap items-center justify-between gap-2 px-1'>
            <span className='text-sm font-medium'>{texts.textLabel}</span>
            <TextModeSwitch value={textMode} onChange={switchText} texts={texts} disabled={textWork !== null} isCompact />
          </div>
        )}
        <div role='tablist' aria-label={texts.languageLabel} className='flex gap-1'>
          {[shopLanguage, ...languages].map(({ id, label }) => (
            <button
              key={id}
              type='button'
              role='tab'
              aria-selected={id === language}
              onClick={() => setLanguage(id)}
              className={cn(
                'min-w-11 rounded-full px-3 py-1.5 text-sm font-medium transition',
                id === language ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {label}
            </button>
          ))}
        </div>
        {isTranslationStale && (
          <div className='flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-muted px-3 py-2 text-sm'>
            <span className='text-muted-foreground'>{fillText(texts.translationsStale, { language: shopLanguage.label })}</span>
            <Button size='sm' variant='outline' className='rounded-full' disabled={textWork !== null} onClick={updateTranslations}>
              <Languages /> {texts.updateTranslations}
            </Button>
          </div>
        )}
        <div role='tabpanel' lang={language} aria-busy={textWork !== null} className='space-y-3'>
          <div className='space-y-1'>
            <Label htmlFor='title' className={LABEL_CLASS}>
              {texts.titleLabel}
            </Label>
            <Input id='title' value={text?.title ?? ''} onChange={setText('title')} className={`${FIELD_CLASS} h-12 font-medium`} />
          </div>
          <div className='space-y-1'>
            <Label htmlFor='short' className={LABEL_CLASS}>
              {texts.shortLabel}
            </Label>
            <Input id='short' value={text?.short ?? ''} onChange={setText('short')} placeholder={text?.title} maxLength={40} className={`${FIELD_CLASS} h-11`} />
          </div>
          <div className='space-y-1'>
            <Label htmlFor='description' className={LABEL_CLASS}>
              {texts.descriptionLabel}
            </Label>
            <Textarea
              id='description'
              value={text?.description ?? ''}
              onChange={setText('description')}
              className={`${FIELD_CLASS} field-sizing-content max-h-[56svh] min-h-32 resize-none overflow-y-auto leading-relaxed`}
            />
          </div>
          {/* The description leads: after changing it, the fields still empty can be filled from it. */}
          {isShopLanguage && (
            <div className='flex flex-wrap items-center gap-x-3 gap-y-1 px-1'>
              <Button
                size='sm'
                variant='outline'
                className='h-auto min-h-8 whitespace-normal rounded-full py-1.5 text-left'
                disabled={isFillingFields || !fields.description.trim()}
                onClick={fillFromDescription}
              >
                {isFillingFields ? <Loader2 className='animate-spin' /> : <WandSparkles />} {isFillingFields ? texts.fillFieldsWorking : texts.fillFields}
              </Button>
              <span className='text-xs text-muted-foreground'>{texts.fillFieldsHint}</span>
            </div>
          )}
        </div>
        {textWork && (
          <div className='absolute inset-0 flex items-center justify-center gap-2 rounded-3xl bg-card/85 text-sm font-medium backdrop-blur-sm'>
            <Loader2 className='size-4 animate-spin text-primary' /> {textWork === 'ai' ? texts.improvingNow : textWork === 'corrected' ? texts.correctingNow : texts.translatingNow}
          </div>
        )}
      </section>

      <div className='grid grid-cols-2 gap-3'>
        {isService && (
          <>
            <PriceInput id='price' label={texts.priceFrom} value={fields.price} onChange={set('price')} state={stateOf('price')} texts={texts} />
            <div className='space-y-1'>
              <FieldLabel htmlFor='serviceType' label={texts.serviceTypeLabel} state={stateOf('serviceType')} texts={texts} />
              <select id='serviceType' value={fields.serviceType} onChange={set('serviceType')} className={cn(SELECT_CLASS, neededClass(stateOf('serviceType')))}>
                <option value=''>–</option>
                {SERVICE_TYPES.map((serviceType) => (
                  <option key={serviceType} value={serviceType}>
                    {texts[`serviceType_${serviceType}`]}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}
        {isEvent && (
          <>
            {/* The native date and time picker needs the whole width on a phone. */}
            <div className='col-span-2 space-y-1 sm:col-span-1'>
              <FieldLabel htmlFor='startsAt' label={texts.eventStartsLabel} state={stateOf('startsAt')} texts={texts} />
              <Input
                id='startsAt'
                type='datetime-local'
                value={fields.startsAt}
                onChange={set('startsAt')}
                className={cn('h-12 rounded-2xl bg-card text-base md:text-base', neededClass(stateOf('startsAt')))}
              />
            </div>
            <div className='col-span-2 sm:col-span-1'>
              <PriceInput id='price' label={texts.eventPrice} value={fields.price} onChange={set('price')} state={stateOf('price')} texts={texts} />
            </div>
            <div className='col-span-2 space-y-1'>
              <FieldLabel htmlFor='address' label={texts.addressLabel} state={stateOf('address')} texts={texts} />
              <AddressInput
                id='address'
                value={fields.address}
                onChange={(address) => set('address')({ target: { value: address } })}
                placeId={fields.placeId}
                placeholder={texts.addressPlaceholder}
                className='h-12 rounded-2xl bg-card text-base md:text-base'
              />
            </div>
          </>
        )}
        {(listing.type === 'PRODUCT' || isWanted) && (
          <>
            {isWanted ? (
              // A wanted ad's budget is a range, so it gets a row of its own.
              <div className='col-span-2 grid grid-cols-2 gap-3'>
                <PriceInput id='price' label={texts.budgetFrom} value={fields.price} onChange={set('price')} state={stateOf('price')} texts={texts} />
                <PriceInput id='priceMax' label={texts.budgetTo} value={fields.priceMax} onChange={set('priceMax')} state={stateOf('priceMax')} texts={texts} />
              </div>
            ) : (
              <PriceInput id='price' label={texts.priceShort} value={fields.price} onChange={set('price')} state={stateOf('price')} texts={texts} />
            )}
            <div className={cn('space-y-1', isWanted && 'col-span-2')}>
              <FieldLabel htmlFor='condition' label={texts.conditionLabel} state={stateOf('condition')} texts={texts} />
              <select id='condition' value={fields.condition} onChange={set('condition')} className={SELECT_CLASS}>
                <option value=''>–</option>
                {PRODUCT_CONDITIONS.filter((condition) => isWanted || condition !== ANY_CONDITION).map((condition) => (
                  <option key={condition} value={condition}>
                    {texts[`condition_${condition}`]}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}
        <div className='col-span-2 space-y-1'>
          <FieldLabel htmlFor='category' label={texts.categoryLabel} state={stateOf('category')} texts={texts} />
          <select id='category' value={fields.category} onChange={set('category')} className={cn(SELECT_CLASS, neededClass(stateOf('category')))}>
            {!fields.category && <option value=''>–</option>}
            {categories.map((category) => (
              <option key={category.slug} value={category.slug}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
        {places.length > 0 && (
          <div className='col-span-2 space-y-1'>
            <FieldLabel htmlFor='place' label={texts.placeLabel} state={stateOf('placeId')} texts={texts} />
            <select id='place' value={fields.placeId} onChange={set('placeId')} className={SELECT_CLASS}>
              {!fields.placeId && <option value=''>–</option>}
              {places.map((place) => (
                <option key={place.id} value={place.id}>
                  {place.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className='space-y-6 rounded-3xl border border-border bg-card p-4'>
        {isOpen && listing.rawText && (
          <p className='rounded-2xl bg-muted p-4 text-sm text-muted-foreground'>
            <span className='font-medium text-foreground'>{texts.sellerSays}:</span> “{listing.rawText}”
          </p>
        )}
        <div className='space-y-2'>
          <p className='text-sm font-medium'>{texts.photosLabel}</p>
          <PhotoUpload photos={images} onChange={setImages} texts={texts} max={MAX_PICTURES} allowVideos />
        </div>
        {/* Also once live: the admin just fixes a wrong number. */}
        <div className='space-y-1'>
          <Label htmlFor='seller-phone' className='text-sm font-medium'>
            {texts.servicePhoneLabel}
          </Label>
          <Input
            id='seller-phone'
            type='tel'
            value={fields.sellerPhone}
            onChange={set('sellerPhone')}
            placeholder={texts.sellerPlaceholder}
            className='h-12 rounded-2xl bg-background'
          />
          {isOpen && <p className='px-1 text-xs text-muted-foreground'>{texts.sellerPhoneEditHint}</p>}
        </div>
        {/* Also once live: the seller may change their name any time. */}
        <div className='space-y-1'>
          <Label htmlFor='seller-name' className='text-sm font-medium'>
            {texts.sellerNameLabel}
          </Label>
          <Input
            id='seller-name'
            maxLength={30}
            value={fields.sellerName}
            onChange={set('sellerName')}
            placeholder={listing.sellerDefault.name ?? ''}
            className='h-12 rounded-2xl bg-background'
          />
          <p className='px-1 text-xs text-muted-foreground'>{texts.sellerNameHint}</p>
        </div>
        {isOpen && (
          <RadioGroup value={plan} onValueChange={(value) => setPlan(value as Plan)} className='flex flex-wrap gap-4'>
            {(['normal', 'big'] as const).map((option) => (
              <Label key={option} className='flex items-center gap-2 font-normal'>
                <RadioGroupItem value={option} /> {option === 'big' ? texts.planBig : texts.planNormal}
              </Label>
            ))}
          </RadioGroup>
        )}
        <div className='flex flex-wrap gap-3'>
          {listing.status === 'IN_REVIEW' && (
            <Button variant='ghost' className='rounded-full text-destructive' disabled={isPending} onClick={() => run(() => rejectAdminListing(listing.id))}>
              <X /> {texts.reject}
            </Button>
          )}
        </div>
      </div>

      {listing.status === 'LIVE' && listing.expiresAt && (
        <div className='flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-border bg-card p-4'>
          <p className='text-sm font-medium'>
            {fillText(texts.liveUntil, {
              date: listing.expiresAt.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric', timeZone: SHOP_TIME_ZONE }),
            })}
          </p>
          <Button variant='outline' className='rounded-full' disabled={isPending} onClick={() => run(() => extendAdminListing(listing.id))}>
            <CalendarPlus /> {texts.extendMonth}
          </Button>
        </div>
      )}

      {error && (
        <p role='alert' className='rounded-2xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive'>
          {error}
        </p>
      )}

      {/* Instead of publishing for free: the person sees their listing first and pays to publish it. */}
      {isOpen && hasPersonWhatsApp && (
        <div className='space-y-1'>
          <Button variant='outline' className='h-12 w-full rounded-full' disabled={isPending} onClick={sendByWhatsApp}>
            <MessageCircle /> {isAwaitingPayment ? texts.resendLink : texts.sendWhatsApp}
          </Button>
          <p className='text-center text-xs text-muted-foreground'>{isAwaitingPayment ? texts.resendLinkHint : texts.sendWhatsAppHint}</p>
        </div>
      )}

      {isOpen && (hasPersonWhatsApp || isAwaitingPayment) && (
        <PaymentPanel
          listing={listing}
          plan={plan}
          hasPersonNumber={hasPersonWhatsApp}
          texts={texts}
          isPending={isPending}
          onConsent={() => run(() => recordWhatsAppConsent(listing.id))}
          onPaid={markPaid}
        />
      )}

      {isOpen && (
        // One thumb-sized button: everything above is already filled in by the AI.
        <div className='sticky bottom-4 z-10 space-y-1'>
          <Button className='h-14 w-full rounded-full text-base shadow-xl shadow-primary/20' disabled={isPending} onClick={publish}>
            {isPending ? <Loader2 className='animate-spin' /> : <Sparkles />} {texts.publishNow}
          </Button>
          <p className='text-center text-xs text-muted-foreground'>{texts.publishNowHint}</p>
        </div>
      )}

      {/* Edits only save here; the bar stays in sight while editing and says when something isn't saved yet. */}
      {!isOpen && (
        <div className='sticky bottom-4 z-10 flex items-center gap-3 rounded-full border border-border bg-card/95 p-2 pl-5 shadow-xl shadow-primary/10 backdrop-blur'>
          <p
            role='status'
            className={cn(
              'flex min-w-0 flex-1 items-center gap-2 text-sm',
              saveState === 'failed' ? 'font-medium text-destructive' : hasUnsaved ? 'text-muted-foreground' : 'text-primary'
            )}
          >
            {saveState === 'saving' ? (
              <Loader2 className='size-4 shrink-0 animate-spin' aria-hidden />
            ) : (
              !hasUnsaved && <CheckCircle2 className='size-4 shrink-0' aria-hidden />
            )}
            <span className='truncate'>{saveLabel}</span>
          </p>
          <Button className='shrink-0 rounded-full' disabled={!hasUnsaved || isPending} onClick={saveNow}>
            <Save /> {texts.saveNow}
          </Button>
        </div>
      )}
    </div>
  );
}

type FieldState = 'set' | 'fromText' | 'missing' | 'needed';

// A field publishing needs, still empty, stands out a little: no error look.
const neededClass = (state: FieldState) => state === 'needed' && 'border-dashed border-primary/60';

interface FieldLabelProps {
  htmlFor: string;
  label: string;
  state: FieldState;
  texts: AdminTexts;
}

/** A field's label with whether it has a value: a calm mark when set, a word when it's still missing. */
function FieldLabel({ htmlFor, label, state, texts }: FieldLabelProps) {
  const { icon: Icon, text } = {
    set: { icon: CheckCircle2, text: texts.fieldSet },
    fromText: { icon: Sparkles, text: texts.fieldFromText },
    missing: { icon: Circle, text: texts.fieldMissing },
    needed: { icon: CircleDot, text: texts.fieldNeeded },
  }[state];
  const isEmpty = state === 'missing' || state === 'needed';
  return (
    <div className='flex min-w-0 items-center justify-between gap-2 px-1'>
      <Label htmlFor={htmlFor} className='truncate text-xs font-normal text-muted-foreground'>
        {label}
      </Label>
      <span
        title={text}
        className={cn(
          'flex shrink-0 items-center gap-1 text-[11px] leading-none',
          state === 'needed' ? 'font-medium text-primary' : state === 'missing' ? 'text-muted-foreground' : 'text-primary'
        )}
      >
        <Icon className='size-3.5' aria-hidden />
        <span className={isEmpty ? undefined : 'sr-only'}>{text}</span>
      </span>
    </div>
  );
}

interface PriceInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (event: { target: { value: string } }) => void;
  state: FieldState;
  texts: AdminTexts;
}

function PriceInput({ id, label, value, onChange, state, texts }: PriceInputProps) {
  return (
    <div className='space-y-1'>
      <FieldLabel htmlFor={id} label={label} state={state} texts={texts} />
      <div className='relative'>
        <Input
          id={id}
          inputMode='decimal'
          value={value}
          onChange={onChange}
          className={cn('h-12 rounded-2xl bg-card pr-8 text-lg font-semibold text-primary md:text-lg', neededClass(state))}
        />
        <span className='absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground'>€</span>
      </div>
    </div>
  );
}
