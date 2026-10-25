'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronDown, ExternalLink, Loader2, Plus, Send, Sparkles, X } from 'lucide-react';
import ProductMedia from '@/components/ProductMedia';
import { PRODUCT_CONDITIONS, type ProductCondition } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import {
  markAdminListingSold,
  publishAdminListing,
  rejectAdminListing,
  sendAdminPaymentLink,
  updateAdminListing,
  type AdminListing,
} from '@/lib/marketplace/admin.actions';
import type { AdminTexts } from '@/lib/marketplace/admin-texts';
import type { ListingTranslations } from '@/lib/marketplace/catalog';
import type { Locale } from '@/lib/i18n-core';
import { cn } from '@/lib/utils';
import ListingStatus, { type SaveState } from './listing-status';
import PhotoUpload from './photo-upload';

/** A shop language, with its short label for the tabs (ES, EN, IT). */
export interface EditorLanguage {
  id: Locale;
  label: string;
}

/** A store category as the editor offers it: its slug and its name in the admin's language. */
export interface CategoryOption {
  slug: string;
  name: string;
}

interface ListingEditorProps {
  listing: AdminListing;
  categories: CategoryOption[];
  /** The shop's other languages, each with its own title and description. */
  languages: EditorLanguage[];
  /** The shop's own language: the listing's title and description. */
  shopLanguage: EditorLanguage;
  texts: AdminTexts;
  houseSeller: string;
  /** Called once "Publish now" worked, so the workspace can show the done moment. */
  onPublished: () => void;
}

type Plan = 'normal' | 'big';

interface EditorFields {
  title: string;
  description: string;
  translations: Record<string, { title: string; description: string }>;
  category: string;
  price: string;
  condition: ProductCondition | '';
}

// A service sends no price and no condition: it never has either.
const toEdit = ({ price, condition, ...fields }: EditorFields, images: string[], isService: boolean) =>
  isService ? { ...fields, images } : { ...fields, price, condition, images };

// Reads like the finished listing; the border only shows on hover and focus, so it still looks editable.
const INLINE_CLASS = 'rounded-xl border-transparent bg-transparent px-2 shadow-none hover:border-border focus-visible:border-ring';
// Native selects: on a phone they open the system's own picker.
const SELECT_CLASS = 'h-12 w-full rounded-2xl border border-border bg-card px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
// Long enough to save once per pause in typing, not once per key.
const AUTOSAVE_MS = 800;

/** Everything the AI made, compact enough for a phone screen, editable, with the ways to put it online. */
export default function ListingEditor({ listing, categories, languages, shopLanguage, texts, houseSeller, onPublished }: ListingEditorProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [images, setImages] = useState(listing.images.length > 0 ? listing.images : listing.rawImages);
  const [fields, setFields] = useState({
    title: listing.title ?? '',
    description: listing.description ?? '',
    translations: Object.fromEntries(
      languages.map(({ id }) => {
        const text = (listing.translations as ListingTranslations)[id];
        return [id, { title: text?.title ?? '', description: text?.description ?? '' }];
      })
    ),
    category: listing.category ?? '',
    price: listing.price ?? '',
    // An unknown value from older data counts as none.
    condition: (PRODUCT_CONDITIONS.includes(listing.condition as ProductCondition) ? listing.condition : '') as ProductCondition | '',
  });
  const [language, setLanguage] = useState<Locale>(shopLanguage.id);
  const [plan, setPlan] = useState<Plan>((listing.plan as Plan) ?? 'normal');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [error, setError] = useState('');
  // What the server has, so only real changes are saved (and React's double effects in dev save nothing).
  const savedSnapshot = useRef(JSON.stringify({ ...fields, images }));
  const hasSellerPhone = listing.seller.waId !== houseSeller;
  // A service has no price and no condition, and its category is a kind of service.
  const isService = listing.kind === 'service';
  const isOpen = listing.status === 'IN_REVIEW' || listing.status === 'AWAITING_PAYMENT';
  const isShopLanguage = language === shopLanguage.id;
  const text = isShopLanguage ? { title: fields.title, description: fields.description } : fields.translations[language];

  const set = (name: 'price' | 'category' | 'condition') => (event: { target: { value: string } }) =>
    setFields((current) => ({ ...current, [name]: event.target.value }));
  // The shop language is the listing's own title and description; the others are its translations.
  const setText = (name: 'title' | 'description') => (event: { target: { value: string } }) =>
    setFields((current) =>
      isShopLanguage
        ? { ...current, [name]: event.target.value }
        : { ...current, translations: { ...current.translations, [language]: { ...current.translations[language], [name]: event.target.value } } }
    );
  const makeMain = (url: string) => setImages((current) => [url, ...current.filter((image) => image !== url)]);

  useEffect(() => {
    const snapshot = JSON.stringify({ ...fields, images });
    if (snapshot === savedSnapshot.current) return;
    setSaveState('saving');
    const timer = setTimeout(async () => {
      const saved = await updateAdminListing(listing.id, toEdit(fields, images, isService));
      if (saved.success) savedSnapshot.current = snapshot;
      setSaveState(saved.success ? 'saved' : 'failed');
      setError(saved.success ? '' : saved.message);
    }, AUTOSAVE_MS);
    return () => clearTimeout(timer);
  }, [fields, images, listing.id, isService]);

  // Every action saves the edits first, so what goes online is what the admin sees.
  const run = (action: () => Promise<{ success: boolean; message: string }>, onSuccess?: () => void) =>
    startTransition(async () => {
      setError('');
      const saved = await updateAdminListing(listing.id, toEdit(fields, images, isService));
      if (!saved.success) return setError(saved.message);
      savedSnapshot.current = JSON.stringify({ ...fields, images });
      const result = await action();
      if (!result.success) return setError(result.message);
      if (onSuccess) onSuccess();
      else toast({ description: result.message });
      router.refresh();
    });

  const publish = () => run(() => publishAdminListing(listing.id, plan), onPublished);

  return (
    <div className='mx-auto w-full max-w-xl space-y-4'>
      <ListingStatus status={listing.status} saveState={saveState} texts={texts} />
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
            <Link href={isService ? '/admin/listings/new?kind=service' : '/admin/listings/new'}>
              <Plus /> {texts.newAnother}
            </Link>
          </Button>
          <Button variant='ghost' className='rounded-full' disabled={isPending} onClick={() => run(() => markAdminListingSold(listing.id))}>
            {texts.markSold}
          </Button>
        </div>
      )}

      {/* The main picture a bit bigger; a tap on another one makes it the main picture. */}
      <ul className='flex items-end gap-3 overflow-x-auto p-1'>
        {images.map((url, index) => (
          <li key={`${index}-${url}`} className='shrink-0'>
            <button
              type='button'
              onClick={() => makeMain(url)}
              aria-label={index === 0 ? texts.mainPhoto : texts.makeMain}
              aria-pressed={index === 0}
              className={cn(
                'relative block overflow-hidden rounded-2xl border-2 bg-muted',
                index === 0 ? 'size-24 border-primary' : 'size-16 border-transparent'
              )}
            >
              <ProductMedia src={url} alt='' fill sizes='6rem' />
              {index === 0 && listing.images.length > 0 && (
                <Sparkles className='absolute left-1.5 top-1.5 size-4 rounded-full bg-background/90 p-0.5 text-primary' aria-label={texts.aiPicture} />
              )}
            </button>
          </li>
        ))}
      </ul>

      <section className='space-y-2 rounded-3xl border border-border bg-card p-3 sm:p-4'>
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
        <div role='tabpanel' lang={language} className='space-y-1'>
          <Label htmlFor='title' className='sr-only'>
            {texts.titleLabel}
          </Label>
          <Input
            id='title'
            value={text?.title ?? ''}
            onChange={setText('title')}
            placeholder={texts.titleLabel}
            className={`${INLINE_CLASS} h-auto py-1 font-display text-2xl md:text-2xl`}
          />
          <Label htmlFor='description' className='sr-only'>
            {texts.descriptionLabel}
          </Label>
          <Textarea
            id='description'
            value={text?.description ?? ''}
            onChange={setText('description')}
            placeholder={texts.descriptionLabel}
            className={`${INLINE_CLASS} field-sizing-content max-h-[28svh] min-h-16 resize-none overflow-y-auto text-base leading-relaxed md:text-base`}
          />
        </div>
      </section>

      <div className='grid grid-cols-2 gap-3'>
        {!isService && (
          <>
            <div className='space-y-1'>
              <Label htmlFor='price' className='px-1 text-xs text-muted-foreground'>
                {texts.priceShort}
              </Label>
              <div className='relative'>
                <Input id='price' inputMode='decimal' value={fields.price} onChange={set('price')} className='h-12 rounded-2xl bg-card pr-8 text-lg font-semibold text-primary md:text-lg' />
                <span className='absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground'>€</span>
              </div>
            </div>
            <div className='space-y-1'>
              <Label htmlFor='condition' className='px-1 text-xs text-muted-foreground'>
                {texts.conditionLabel}
              </Label>
              <select id='condition' value={fields.condition} onChange={set('condition')} className={SELECT_CLASS}>
                <option value=''>–</option>
                {PRODUCT_CONDITIONS.map((condition) => (
                  <option key={condition} value={condition}>
                    {texts[`condition_${condition}`]}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}
        <div className='col-span-2 space-y-1'>
          <div className='flex items-baseline justify-between gap-3 px-1'>
            <Label htmlFor='category' className='text-xs text-muted-foreground'>
              {isService ? texts.serviceKindLabel : texts.categoryLabel}
            </Label>
            {isService && (
              <Link href='/admin/services/subcategories' className='text-xs text-primary underline-offset-4 hover:underline'>
                {texts.editServiceKinds}
              </Link>
            )}
          </div>
          <select id='category' value={fields.category} onChange={set('category')} className={SELECT_CLASS}>
            {!fields.category && <option value=''>–</option>}
            {categories.map((category) => (
              <option key={category.slug} value={category.slug}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <details className='group rounded-3xl border border-border bg-card'>
        <summary className='flex cursor-pointer list-none items-center justify-between gap-3 p-4 font-medium'>
          {texts.moreOptions}
          <ChevronDown className='size-4 transition-transform group-open:rotate-180' />
        </summary>
        <div className='space-y-6 px-4 pb-4'>
          {listing.rawText && (
            <p className='rounded-2xl bg-muted p-4 text-sm text-muted-foreground'>
              <span className='font-medium text-foreground'>{texts.sellerSays}:</span> “{listing.rawText}”
            </p>
          )}
          <div className='space-y-2'>
            <p className='text-sm font-medium'>{texts.photosLabel}</p>
            <PhotoUpload photos={images} onChange={setImages} texts={texts} max={12} />
          </div>
          {listing.rawImages.length > 0 && (
            <div className='space-y-2'>
              <p className='text-sm font-medium'>{texts.original}</p>
              <ul className='flex gap-2 overflow-x-auto'>
                {listing.rawImages.map((url) => (
                  <li key={url} className='relative size-16 shrink-0 overflow-hidden rounded-xl border border-border bg-muted'>
                    <ProductMedia src={url} alt='' fill />
                  </li>
                ))}
              </ul>
            </div>
          )}
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
            {hasSellerPhone && listing.status === 'IN_REVIEW' && (
              <Button variant='outline' className='rounded-full' disabled={isPending} onClick={() => run(() => sendAdminPaymentLink(listing.id))}>
                <Send /> {texts.sendLink}
              </Button>
            )}
            {listing.status === 'IN_REVIEW' && (
              <Button variant='ghost' className='rounded-full text-destructive' disabled={isPending} onClick={() => run(() => rejectAdminListing(listing.id))}>
                <X /> {texts.reject}
              </Button>
            )}
          </div>
          {hasSellerPhone && listing.status === 'IN_REVIEW' && <p className='text-xs text-muted-foreground'>{texts.sendLinkHint}</p>}
        </div>
      </details>

      {error && (
        <p role='alert' className='rounded-2xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive'>
          {error}
        </p>
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
    </div>
  );
}
