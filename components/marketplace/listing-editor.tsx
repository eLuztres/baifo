'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ExternalLink, Loader2, Send, Sparkles, Tag, X } from 'lucide-react';
import ProductMedia from '@/components/ProductMedia';
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
import PhotoUpload from './photo-upload';

interface ListingEditorProps {
  listing: AdminListing;
  categories: string[];
  texts: AdminTexts;
  houseSeller: string;
}

type Plan = 'normal' | 'big';

const FIELD_CLASS = 'rounded-2xl bg-background';

/** Everything the AI made, editable, with the ways to put it online. */
export default function ListingEditor({ listing, categories, texts, houseSeller }: ListingEditorProps) {
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
  });
  const [plan, setPlan] = useState<Plan>((listing.plan as Plan) ?? 'normal');
  const hasSellerPhone = listing.seller.waId !== houseSeller;
  const isOpen = listing.status === 'IN_REVIEW' || listing.status === 'AWAITING_PAYMENT';

  const set = (name: keyof typeof fields) => (event: { target: { value: string } }) =>
    setFields((current) => ({ ...current, [name]: event.target.value }));

  // Every action saves the edits first, so what goes online is what the admin sees.
  const run = (action?: () => Promise<{ success: boolean; message: string; slug?: string }>) =>
    startTransition(async () => {
      const saved = await updateAdminListing(listing.id, { ...fields, images });
      if (!saved.success || !action) {
        toast({ variant: saved.success ? 'default' : 'destructive', description: saved.success ? texts.saved : saved.message });
        router.refresh();
        return;
      }
      const result = await action();
      toast({ variant: result.success ? 'default' : 'destructive', description: result.message });
      router.refresh();
    });

  return (
    <div className='grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]'>
      <section className='space-y-5'>
        <div className='relative aspect-square overflow-hidden rounded-3xl border border-border bg-muted shadow-xl shadow-primary/5'>
          {images[0] && <ProductMedia src={images[0]} alt={fields.title} fill />}
          <span className='absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-background/90 px-3 py-1 text-xs font-medium shadow'>
            <Sparkles className='size-3.5 text-primary' /> {texts.aiPicture}
          </span>
        </div>
        <PhotoUpload photos={images} onChange={setImages} texts={texts} max={12} />
        {listing.rawImages.length > 0 && (
          <div className='space-y-2'>
            <p className='eyebrow'>{texts.original}</p>
            <ul className='flex gap-2 overflow-x-auto'>
              {listing.rawImages.map((url) => (
                <li key={url} className='relative size-16 shrink-0 overflow-hidden rounded-xl border border-border bg-muted'>
                  <ProductMedia src={url} alt='' fill />
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className='space-y-6'>
        {listing.rawText && (
          <p className='rounded-2xl bg-muted p-4 text-sm text-muted-foreground'>
            <span className='font-medium text-foreground'>{texts.sellerSays}:</span> “{listing.rawText}”
          </p>
        )}

        <div className='space-y-4 rounded-3xl border border-border bg-card p-5 sm:p-6'>
          <div className='space-y-2'>
            <Label htmlFor='title'>{texts.titleLabel}</Label>
            <Input id='title' value={fields.title} onChange={set('title')} className={`${FIELD_CLASS} h-12 text-lg`} />
          </div>
          <div className='grid gap-4 sm:grid-cols-2'>
            <div className='space-y-2'>
              <Label htmlFor='price'>{texts.priceShort}</Label>
              <div className='relative'>
                <Input id='price' inputMode='decimal' value={fields.price} onChange={set('price')} className={`${FIELD_CLASS} h-12 pr-8 text-lg`} />
                <span className='absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground'>€</span>
              </div>
            </div>
            <div className='space-y-2'>
              <Label htmlFor='category'>{texts.categoryLabel}</Label>
              <div className='relative'>
                <Tag className='absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
                <Input id='category' list='listing-categories' value={fields.category} onChange={set('category')} className={`${FIELD_CLASS} h-12 pl-10`} />
                <datalist id='listing-categories'>
                  {categories.map((category) => (
                    <option key={category} value={category} />
                  ))}
                </datalist>
              </div>
            </div>
          </div>
          <div className='space-y-2'>
            <Label htmlFor='description'>{texts.descriptionLabel}</Label>
            <Textarea id='description' rows={5} value={fields.description} onChange={set('description')} className={FIELD_CLASS} />
          </div>
          <div className='space-y-2'>
            <Label htmlFor='descriptionEn'>{texts.descriptionEnLabel}</Label>
            <Textarea id='descriptionEn' rows={4} value={fields.descriptionEn} onChange={set('descriptionEn')} className={FIELD_CLASS} />
          </div>
          <Button variant='outline' className='rounded-full' disabled={isPending} onClick={() => run()}>
            {texts.save}
          </Button>
        </div>

        {isOpen && (
          <div className='space-y-4 rounded-3xl border border-primary/30 bg-primary/5 p-5 sm:p-6'>
            <p className='font-display text-xl'>{texts.publishTitle}</p>
            <RadioGroup value={plan} onValueChange={(value) => setPlan(value as Plan)} className='flex flex-wrap gap-4'>
              {(['normal', 'big'] as const).map((option) => (
                <Label key={option} className='flex items-center gap-2 font-normal'>
                  <RadioGroupItem value={option} /> {option === 'big' ? texts.planBig : texts.planNormal}
                </Label>
              ))}
            </RadioGroup>
            <div className='grid gap-3 sm:grid-cols-2'>
              <div className='space-y-1'>
                <Button className='h-12 w-full rounded-full text-base' disabled={isPending} onClick={() => run(() => publishAdminListing(listing.id, plan))}>
                  {isPending ? <Loader2 className='animate-spin' /> : <Sparkles />} {texts.publishNow}
                </Button>
                <p className='text-center text-xs text-muted-foreground'>{texts.publishNowHint}</p>
              </div>
              {hasSellerPhone && listing.status === 'IN_REVIEW' && (
                <div className='space-y-1'>
                  <Button variant='outline' className='h-12 w-full rounded-full' disabled={isPending} onClick={() => run(() => sendAdminPaymentLink(listing.id))}>
                    <Send /> {texts.sendLink}
                  </Button>
                  <p className='text-center text-xs text-muted-foreground'>{texts.sendLinkHint}</p>
                </div>
              )}
            </div>
            {listing.status === 'IN_REVIEW' && (
              <Button variant='ghost' className='rounded-full text-destructive' disabled={isPending} onClick={() => run(() => rejectAdminListing(listing.id))}>
                <X /> {texts.reject}
              </Button>
            )}
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
            <Button variant='outline' className='rounded-full' disabled={isPending} onClick={() => run(() => markAdminListingSold(listing.id))}>
              {texts.markSold}
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
