'use client';

import { useRef, useState, useTransition, type DragEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, ImagePlus, Loader2, Sparkles, X } from 'lucide-react';
import ProductMedia from '@/components/ProductMedia';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

/** Like a WhatsApp message: a photo, a few optional words (the price too), send. The AI does the rest. */
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
      if ('id' in result && result.id) router.push(`/admin/listings/${result.id}`);
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

      <ListingStage src={photos[0]} onDragOver={(event) => event.preventDefault()} onDrop={dropPhotos}>
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

      <div className='flex justify-center'>
        <button
          type='button'
          onClick={() => setIsForSeller((current) => !current)}
          aria-expanded={isForSeller}
          className='rounded-full px-3 py-2 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline'
        >
          {texts.forSeller}
        </button>
      </div>

      {error && (
        <p role='alert' className='text-center text-sm text-destructive'>
          {error}
        </p>
      )}

      {/* Stays under the thumb while scrolling, like a chat's message box. */}
      <div className='sticky bottom-4 z-10 rounded-[1.75rem] border border-border bg-card/95 p-2 shadow-xl backdrop-blur'>
        {isForSeller && (
          <div className='space-y-2 px-3 pb-3 pt-2'>
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
        <div className='flex items-end gap-1'>
          <Button type='button' variant='ghost' size='icon' className='size-12 shrink-0 rounded-full' onClick={pickPhotos} disabled={isUploading} aria-label={texts.addPhoto}>
            <ImagePlus className='size-5' />
          </Button>
          <label htmlFor='notes' className='sr-only'>
            {texts.composerLabel}
          </label>
          <textarea
            id='notes'
            rows={1}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                send();
              }
            }}
            placeholder={texts.composerPlaceholder}
            className='field-sizing-content max-h-40 min-h-12 flex-1 resize-none bg-transparent px-2 py-3 text-base outline-none placeholder:text-muted-foreground'
          />
          <Button type='button' className='h-12 shrink-0 rounded-full px-4' disabled={!canSend} onClick={send} aria-label={texts.send}>
            {isPending ? <Loader2 className='animate-spin' /> : <Sparkles />}
            <span className='hidden sm:inline'>{isPending ? texts.creating : texts.send}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
