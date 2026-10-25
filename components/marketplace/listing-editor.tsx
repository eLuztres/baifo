'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronDown, ExternalLink, Loader2, Plus, Send, Sparkles, Tag, X } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import ListingStage from './listing-stage';
import ListingStatus, { type SaveState } from './listing-status';
import PhotoUpload from './photo-upload';

interface ListingEditorProps {
  listing: AdminListing;
  categories: string[];
  texts: AdminTexts;
  houseSeller: string;
  /** Called once "Publish now" worked, so the workspace can show the done moment. */
  onPublished: () => void;
}

type Plan = 'normal' | 'big';

const FIELD_CLASS = 'rounded-2xl bg-background';
// Reads like the finished listing; the border only shows on hover and focus, so it still looks editable.
const INLINE_CLASS = 'rounded-xl border-transparent bg-transparent px-2 shadow-none hover:border-border focus-visible:border-ring';
// Long enough to save once per pause in typing, not once per key.
const AUTOSAVE_MS = 800;

/** Everything the AI made, editable, with the ways to put it online. */
export default function ListingEditor({ listing, categories, texts, houseSeller, onPublished }: ListingEditorProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [images, setImages] = useState(listing.images.length > 0 ? listing.images : listing.rawImages);
  const [fields, setFields] = useState({
    title: listing.title ?? '',
    description: listing.description ?? '',
    descriptionEn: listing.descriptionEn ?? '',
    category: listing.category ?? '',
    price: listing.price ?? '',
    // An unknown value from older data counts as none.
    condition: (PRODUCT_CONDITIONS.includes(listing.condition as ProductCondition) ? listing.condition : '') as ProductCondition | '',
  });
  const [plan, setPlan] = useState<Plan>((listing.plan as Plan) ?? 'normal');
  const [isShowingOriginal, setIsShowingOriginal] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [error, setError] = useState('');
  // What the server has, so only real changes are saved (and React's double effects in dev save nothing).
  const savedSnapshot = useRef(JSON.stringify({ ...fields, images }));
  const hasSellerPhone = listing.seller.waId !== houseSeller;
  const isOpen = listing.status === 'IN_REVIEW' || listing.status === 'AWAITING_PAYMENT';

  const set = (name: keyof typeof fields) => (event: { target: { value: string } }) =>
    setFields((current) => ({ ...current, [name]: event.target.value }));

  useEffect(() => {
    const snapshot = JSON.stringify({ ...fields, images });
    if (snapshot === savedSnapshot.current) return;
    setSaveState('saving');
    const timer = setTimeout(async () => {
      const saved = await updateAdminListing(listing.id, { ...fields, images });
      if (saved.success) savedSnapshot.current = snapshot;
      setSaveState(saved.success ? 'saved' : 'failed');
      setError(saved.success ? '' : saved.message);
    }, AUTOSAVE_MS);
    return () => clearTimeout(timer);
  }, [fields, images, listing.id]);

  // Every action saves the edits first, so what goes online is what the admin sees.
  const run = (action: () => Promise<{ success: boolean; message: string }>, onSuccess?: () => void) =>
    startTransition(async () => {
      setError('');
      const saved = await updateAdminListing(listing.id, { ...fields, images });
      if (!saved.success) return setError(saved.message);
      savedSnapshot.current = JSON.stringify({ ...fields, images });
      const result = await action();
      if (!result.success) return setError(result.message);
      if (onSuccess) onSuccess();
      else toast({ description: result.message });
      router.refresh();
    });

  const hasAiPicture = listing.images.length > 0 && listing.rawImages.length > 0;
  const publish = () => run(() => publishAdminListing(listing.id, plan), onPublished);

  return (
    <div className='mx-auto w-full max-w-xl space-y-6'>
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
            <Link href='/admin/listings/new'>
              <Plus /> {texts.newAnother}
            </Link>
          </Button>
          <Button variant='ghost' className='rounded-full' disabled={isPending} onClick={() => run(() => markAdminListingSold(listing.id))}>
            {texts.markSold}
          </Button>
        </div>
      )}

      <ListingStage src={isShowingOriginal ? listing.rawImages[0] : images[0]} alt={fields.title}>
        {hasAiPicture && !isShowingOriginal && (
          <span className='absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-background/90 px-3 py-1 text-xs font-medium shadow'>
            <Sparkles className='size-3.5 text-primary' /> {texts.aiPicture}
          </span>
        )}
        {hasAiPicture && (
          <button
            type='button'
            aria-pressed={isShowingOriginal}
            onClick={() => setIsShowingOriginal((current) => !current)}
            className='absolute bottom-4 right-4 rounded-full bg-background/90 px-4 py-2 text-sm font-medium shadow transition hover:bg-background'
          >
            {isShowingOriginal ? texts.showAi : texts.showOriginal}
          </button>
        )}
      </ListingStage>

      <div className='space-y-3'>
        <Label htmlFor='title' className='sr-only'>
          {texts.titleLabel}
        </Label>
        <Input id='title' value={fields.title} onChange={set('title')} className={`${INLINE_CLASS} h-auto py-1 font-display text-3xl md:text-3xl`} />
        <div className='flex flex-wrap items-center gap-3'>
          <Label htmlFor='price' className='sr-only'>
            {texts.priceShort}
          </Label>
          <div className='relative w-36'>
            <Input id='price' inputMode='decimal' value={fields.price} onChange={set('price')} className={`${INLINE_CLASS} h-12 pr-8 text-2xl font-semibold text-primary md:text-2xl`} />
            <span className='absolute right-3 top-1/2 -translate-y-1/2 text-lg text-muted-foreground'>€</span>
          </div>
          <Label htmlFor='category' className='sr-only'>
            {texts.categoryLabel}
          </Label>
          <div className='relative min-w-0 flex-1'>
            <Tag className='absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
            <Input id='category' list='listing-categories' value={fields.category} onChange={set('category')} className='h-10 rounded-full bg-card pl-9' />
            <datalist id='listing-categories'>
              {categories.map((category) => (
                <option key={category} value={category} />
              ))}
            </datalist>
          </div>
        </div>
        {/* The AI picks it; one tap changes it, a tap on the chosen one clears it. */}
        <div role='radiogroup' aria-label={texts.conditionLabel} className='flex flex-wrap gap-2 px-1'>
          {PRODUCT_CONDITIONS.map((condition) => {
            const isChosen = fields.condition === condition;
            return (
              <button
                key={condition}
                type='button'
                role='radio'
                aria-checked={isChosen}
                onClick={() => setFields((current) => ({ ...current, condition: isChosen ? '' : condition }))}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-sm transition',
                  isChosen ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-muted-foreground hover:text-foreground'
                )}
              >
                {texts[`condition_${condition}`]}
              </button>
            );
          })}
        </div>
        <Label htmlFor='description' className='sr-only'>
          {texts.descriptionLabel}
        </Label>
        <Textarea id='description' value={fields.description} onChange={set('description')} className={`${INLINE_CLASS} field-sizing-content min-h-24 resize-none text-base leading-relaxed md:text-base`} />
        {listing.rawText && (
          <p className='rounded-2xl bg-muted p-4 text-sm text-muted-foreground'>
            <span className='font-medium text-foreground'>{texts.sellerSays}:</span> “{listing.rawText}”
          </p>
        )}
      </div>

      <details className='group rounded-3xl border border-border bg-card'>
        <summary className='flex cursor-pointer list-none items-center justify-between gap-3 p-5 font-medium'>
          {texts.moreOptions}
          <ChevronDown className='size-4 transition-transform group-open:rotate-180' />
        </summary>
        <div className='space-y-6 px-5 pb-5'>
          <div className='space-y-2'>
            <Label htmlFor='descriptionEn'>{texts.descriptionEnLabel}</Label>
            <Textarea id='descriptionEn' rows={4} value={fields.descriptionEn} onChange={set('descriptionEn')} className={FIELD_CLASS} />
          </div>
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
