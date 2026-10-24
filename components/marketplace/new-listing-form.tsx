'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { createAdminListing } from '@/lib/marketplace/admin.actions';
import type { AdminTexts } from '@/lib/marketplace/admin-texts';
import PhotoUpload from './photo-upload';

interface NewListingFormProps {
  texts: AdminTexts;
}

const FIELD_CLASS = 'h-12 rounded-2xl bg-background';

/** Step 1: photos and, if wanted, a few words, the price and the seller. Everything else is the AI's. */
export default function NewListingForm({ texts }: NewListingFormProps) {
  const router = useRouter();
  const [photos, setPhotos] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [price, setPrice] = useState('');
  const [sellerPhone, setSellerPhone] = useState('');
  const [hasConsent, setHasConsent] = useState(false);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const create = () =>
    startTransition(async () => {
      setError('');
      const result = await createAdminListing({
        photos,
        notes,
        price: price.trim() || undefined,
        sellerPhone: sellerPhone.trim() || undefined,
        hasContactConsent: hasConsent,
      });
      if ('id' in result && result.id) router.push(`/admin/listings/${result.id}`);
      else setError(result.message);
    });

  return (
    <div className='grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]'>
      <section className='space-y-3'>
        <h2 className='font-display text-2xl'>{texts.photosTitle}</h2>
        <p className='text-sm text-muted-foreground'>{texts.photosHint}</p>
        <PhotoUpload photos={photos} onChange={setPhotos} texts={texts} />
      </section>

      <section className='space-y-5 rounded-3xl border border-border bg-card p-5 sm:p-6'>
        <div className='space-y-2'>
          <Label htmlFor='notes'>{texts.notesLabel}</Label>
          <Textarea id='notes' rows={4} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder={texts.notesPlaceholder} className='rounded-2xl bg-background' />
        </div>
        <div className='space-y-2'>
          <Label htmlFor='price'>{texts.priceLabel}</Label>
          <div className='relative'>
            <Input id='price' inputMode='decimal' value={price} onChange={(event) => setPrice(event.target.value)} placeholder={texts.pricePlaceholder} className={`${FIELD_CLASS} pr-8`} />
            <span className='absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground'>€</span>
          </div>
        </div>
        <div className='space-y-2'>
          <Label htmlFor='seller'>{texts.sellerLabel}</Label>
          <Input id='seller' type='tel' value={sellerPhone} onChange={(event) => setSellerPhone(event.target.value)} placeholder={texts.sellerPlaceholder} className={FIELD_CLASS} />
          <p className='text-xs text-muted-foreground'>{texts.sellerHint}</p>
          {sellerPhone.trim() && (
            <Label className='flex items-start gap-3 pt-1 font-normal leading-5'>
              <Checkbox checked={hasConsent} onCheckedChange={(value) => setHasConsent(value === true)} className='mt-0.5' />
              {texts.consent}
            </Label>
          )}
        </div>
        {error && <p className='text-sm text-destructive'>{error}</p>}
        <Button size='lg' className='h-14 w-full rounded-full text-base' disabled={photos.length === 0 || isPending} onClick={create}>
          {isPending ? <Loader2 className='animate-spin' /> : <Sparkles />}
          {isPending ? texts.creating : texts.createButton}
        </Button>
      </section>
    </div>
  );
}
