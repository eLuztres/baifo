'use client';

import { useRef, useState, useTransition, type DragEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, ImagePlus, Loader2, Sparkles, X } from 'lucide-react';
import ProductMedia from '@/components/ProductMedia';
import VoiceInputButton from '@/components/shared/voice-input-button';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { createAdminListing } from '@/lib/marketplace/admin.actions';
import { fillText, type AdminTexts } from '@/lib/marketplace/admin-texts';
import { preparePhotos } from '@/lib/prepare-photos';
import { useUploadThing } from '@/lib/uploadthing';
import { cn } from '@/lib/utils';
import ListingStage from './listing-stage';

interface NewListingFormProps {
  texts: AdminTexts;
}

// What the photosUploader route takes at once.
const MAX_PHOTOS = 8;

/** Step 1: photos and one text with everything about the item (the price too). The AI does the rest. */
export default function NewListingForm({ texts }: NewListingFormProps) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [isForSeller, setIsForSeller] = useState(false);
  const [sellerPhone, setSellerPhone] = useState('');
  const [hasConsent, setHasConsent] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const { startUpload } = useUploadThing('photosUploader', {
    onUploadProgress: setProgress,
    onUploadError: (uploadError) => setError(uploadError.message),
  });

  const isUploading = progress !== null;
  const canSend = photos.length > 0 && !isUploading && !isPending;

  const addPhotos = async (files: File[]) => {
    const free = MAX_PHOTOS - photos.length;
    if (files.length === 0 || free <= 0 || isUploading) return;
    setError('');
    setProgress(0);
    try {
      const uploaded = await startUpload(await preparePhotos(files.slice(0, free)));
      if (uploaded) setPhotos((current) => [...current, ...uploaded.map((file) => file.ufsUrl)].slice(0, MAX_PHOTOS));
    } finally {
      setProgress(null);
    }
  };

  const pickPhotos = () => fileInput.current?.click();
  const dropPhotos = (event: DragEvent) => {
    event.preventDefault();
    addPhotos([...event.dataTransfer.files]);
  };
  const remove = (url: string) => setPhotos((current) => current.filter((photo) => photo !== url));
  const makeMain = (url: string) => setPhotos((current) => [url, ...current.filter((photo) => photo !== url)]);

  const send = () => {
    if (!canSend) return;
    startTransition(async () => {
      setError('');
      const phone = isForSeller ? sellerPhone.trim() : '';
      const result = await createAdminListing({
        photos,
        notes,
        sellerPhone: phone || undefined,
        hasContactConsent: Boolean(phone) && hasConsent,
      });
      if ('id' in result && result.id) router.push(`/admin/listings/${result.id}?paso=categoria`);
      else setError(result.message);
    });
  };

  return (
    <div className='mx-auto flex w-full max-w-xl flex-col gap-5'>
      <header className='space-y-1 text-center'>
        <h1 className='font-display text-3xl sm:text-4xl'>{texts.composeTitle}</h1>
        <p className='text-muted-foreground'>{texts.composeHint}</p>
      </header>

      <input
        ref={fileInput}
        type='file'
        accept='image/*'
        multiple
        className='hidden'
        onChange={(event) => {
          addPhotos([...(event.target.files ?? [])]);
          event.target.value = '';
        }}
      />

      <ListingStage src={photos[0]} className='aspect-[4/3]' onDragOver={(event) => event.preventDefault()} onDrop={dropPhotos}>
        {photos.length === 0 && (
          <button
            type='button'
            onClick={pickPhotos}
            className='absolute inset-0 flex flex-col items-center justify-center gap-4 p-8 text-center transition-colors hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-ring/40'
          >
            <span className='flex size-24 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30'>
              <Camera className='size-10' aria-hidden />
            </span>
            <span className='font-display text-2xl'>{texts.takePhoto}</span>
            <span className='hidden text-sm text-muted-foreground sm:block'>{texts.dropHere}</span>
          </button>
        )}
        {isUploading && (
          <div className='absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/80 backdrop-blur-sm'>
            <Loader2 className='size-8 animate-spin text-primary' />
            <p className='text-sm font-medium'>{fillText(texts.uploading, { progress })}</p>
          </div>
        )}
      </ListingStage>

      {photos.length > 0 && (
        <ul className='flex gap-3 overflow-x-auto p-1'>
          {photos.map((url, index) => (
            <li key={url} className='relative shrink-0'>
              <button
                type='button'
                onClick={() => makeMain(url)}
                aria-label={index === 0 ? texts.mainPhoto : texts.makeMain}
                aria-pressed={index === 0}
                className={cn('relative block size-16 overflow-hidden rounded-2xl border-2 bg-muted', index === 0 ? 'border-primary' : 'border-transparent')}
              >
                <ProductMedia src={url} alt='' fill sizes='4rem' />
              </button>
              <button
                type='button'
                onClick={() => remove(url)}
                aria-label={texts.removePhoto}
                className='absolute -right-2 -top-2 flex size-7 items-center justify-center rounded-full border border-border bg-background shadow transition hover:bg-destructive hover:text-destructive-foreground'
              >
                <X className='size-3.5' />
              </button>
            </li>
          ))}
          {photos.length < MAX_PHOTOS && (
            <li className='shrink-0'>
              <button
                type='button'
                onClick={pickPhotos}
                disabled={isUploading}
                aria-label={texts.addPhoto}
                className='flex size-16 items-center justify-center rounded-2xl border-2 border-dashed border-border text-muted-foreground transition hover:border-primary hover:text-primary'
              >
                <ImagePlus className='size-5' />
              </button>
            </li>
          )}
        </ul>
      )}

      <div className='space-y-2 rounded-3xl border border-border bg-card p-4 sm:p-5'>
        <div className='flex items-center justify-between gap-3'>
          <Label htmlFor='notes' className='font-display text-xl'>
            {texts.tellLabel}
          </Label>
          {/* Spoken words land in the field, where they can still be corrected before sending. */}
          <VoiceInputButton onText={(text) => setNotes((current) => (current.trim() ? `${current.trimEnd()} ${text}` : text))} />
        </div>
        <Textarea
          id='notes'
          rows={4}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder={texts.tellPlaceholder}
          className='field-sizing-content min-h-28 resize-none rounded-2xl bg-background text-base md:text-base'
        />
        <button
          type='button'
          onClick={() => setIsForSeller((current) => !current)}
          aria-expanded={isForSeller}
          className='rounded-full py-1 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline'
        >
          {texts.forSeller}
        </button>
        {isForSeller && (
          <div className='space-y-2 pt-1'>
            <Label htmlFor='seller'>{texts.sellerLabel}</Label>
            <Input
              id='seller'
              type='tel'
              autoFocus
              value={sellerPhone}
              onChange={(event) => setSellerPhone(event.target.value)}
              placeholder={texts.sellerPlaceholder}
              className='h-12 rounded-2xl bg-background'
            />
            <p className='text-xs text-muted-foreground'>{texts.sellerHint}</p>
            {sellerPhone.trim() && (
              <Label className='flex items-start gap-3 pt-1 font-normal leading-5'>
                <Checkbox checked={hasConsent} onCheckedChange={(value) => setHasConsent(value === true)} className='mt-0.5' />
                {texts.consent}
              </Label>
            )}
          </div>
        )}
      </div>

      {error && (
        <p role='alert' className='text-center text-sm text-destructive'>
          {error}
        </p>
      )}

      {/* One thumb-sized button; it stays in reach while the text grows. */}
      <div className='sticky bottom-4 z-10'>
        <Button type='button' className='h-14 w-full rounded-full text-base shadow-xl shadow-primary/20' disabled={!canSend} onClick={send}>
          {isPending ? <Loader2 className='animate-spin' /> : <Sparkles />} {isPending ? texts.creating : texts.send}
        </Button>
      </div>
    </div>
  );
}
