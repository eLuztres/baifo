'use client';

import { useEffect, useRef, useState, useTransition, type DragEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Camera, ImagePlus, Loader2, RotateCw, Sparkles, X } from 'lucide-react';
import ProductMedia from '@/components/ProductMedia';
import { Button } from '@/components/ui/button';
import { createAdminListing, getAdminListing, retryAdminListing, type AdminListing } from '@/lib/marketplace/admin.actions';
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
const POLL_MS = 2500;

/** Step 1: only the photos. One tap makes the AI pictures, and they show up right here. */
export default function NewListingForm({ texts }: NewListingFormProps) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [listing, setListing] = useState<AdminListing | null>(null);
  const [shownIndex, setShownIndex] = useState(0);
  const [isShowingOriginal, setIsShowingOriginal] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const { startUpload } = useUploadThing('photosUploader', {
    onUploadProgress: setProgress,
    onUploadError: (uploadError) => setError(uploadError.message),
  });

  const pictures = listing?.images ?? [];
  const isMaking = Boolean(listing) && pictures.length === 0 && !listing?.lastError;
  const isUploading = progress !== null;

  // The AI takes up to a minute: ask until its pictures (or an error) are there.
  useEffect(() => {
    if (!listing || !isMaking) return;
    const timer = setInterval(async () => {
      const next = await getAdminListing(listing.id);
      if (next) setListing(next);
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [listing, isMaking]);

  const addPhotos = async (files: File[]) => {
    const free = MAX_PHOTOS - photos.length;
    if (files.length === 0 || free <= 0 || isUploading || listing) return;
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
  const remove = (url: string) => {
    setPhotos((current) => current.filter((photo) => photo !== url));
    setShownIndex(0);
  };

  const makePictures = () =>
    startTransition(async () => {
      setError('');
      const result = await createAdminListing({ photos });
      if (!('id' in result && result.id)) return setError(result.message);
      const created = await getAdminListing(result.id);
      if (created) setListing(created);
      setShownIndex(0);
    });

  const retry = () =>
    listing &&
    startTransition(async () => {
      await retryAdminListing(listing.id);
      setListing({ ...listing, lastError: null });
    });

  // Before the AI: the chosen photo. After: the AI picture, or its original on request.
  const thumbnails = pictures.length > 0 ? pictures : photos;
  const stageSource = pictures.length > 0 && !isShowingOriginal ? pictures[shownIndex] : photos[shownIndex] ?? photos[0];

  return (
    <div className='mx-auto flex w-full max-w-xl flex-col gap-4'>
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

      {/* Square and at most half the screen, so photo, thumbnails and button fit on a phone without scrolling. */}
      <ListingStage
        src={stageSource}
        className='mx-auto aspect-square max-h-[52svh] max-w-[52svh] sm:max-h-none sm:max-w-none'
        onDragOver={(event) => event.preventDefault()}
        onDrop={dropPhotos}
      >
        {photos.length === 0 && (
          <button
            type='button'
            onClick={pickPhotos}
            className='absolute inset-0 flex flex-col items-center justify-center gap-4 p-8 text-center transition-colors hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-ring/40'
          >
            <span className='flex size-20 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30'>
              <Camera className='size-9' aria-hidden />
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
        {isMaking && (
          <>
            <span className='absolute inset-0 animate-pulse bg-primary/15 motion-reduce:animate-none' />
            <span className='absolute left-3 top-3 inline-flex items-center gap-2 rounded-full bg-background/90 px-3 py-1.5 text-sm font-medium shadow'>
              <Loader2 className='size-4 animate-spin text-primary' /> {texts.picturesWorking}
            </span>
          </>
        )}
        {pictures.length > 0 && (
          <>
            {!isShowingOriginal && (
              <span className='absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-background/90 px-3 py-1 text-xs font-medium shadow'>
                <Sparkles className='size-3.5 text-primary' /> {texts.aiPicture}
              </span>
            )}
            <button
              type='button'
              aria-pressed={isShowingOriginal}
              onClick={() => setIsShowingOriginal((current) => !current)}
              className='absolute bottom-3 right-3 rounded-full bg-background/90 px-4 py-2 text-sm font-medium shadow transition hover:bg-background'
            >
              {isShowingOriginal ? texts.showAi : texts.showOriginal}
            </button>
          </>
        )}
      </ListingStage>

      {thumbnails.length > 0 && (
        <ul className='flex gap-3 overflow-x-auto p-1'>
          {thumbnails.map((url, index) => (
            <li key={`${index}-${url}`} className='relative shrink-0'>
              <button
                type='button'
                onClick={() => {
                  setShownIndex(index);
                  setIsShowingOriginal(false);
                }}
                aria-pressed={index === shownIndex}
                aria-label={`${texts.photosLabel} ${index + 1}`}
                className={cn('relative block size-16 overflow-hidden rounded-2xl border-2 bg-muted', index === shownIndex ? 'border-primary' : 'border-transparent')}
              >
                <ProductMedia src={url} alt='' fill sizes='4rem' />
              </button>
              {!listing && (
                <button
                  type='button'
                  onClick={() => remove(url)}
                  aria-label={texts.removePhoto}
                  className='absolute -right-2 -top-2 flex size-7 items-center justify-center rounded-full border border-border bg-background shadow transition hover:bg-destructive hover:text-destructive-foreground'
                >
                  <X className='size-3.5' />
                </button>
              )}
            </li>
          ))}
          {!listing && photos.length < MAX_PHOTOS && (
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

      {(error || listing?.lastError) && (
        <div role='alert' className='flex items-center justify-between gap-3 rounded-2xl border border-destructive/40 p-3 text-sm text-destructive'>
          <span>{error || texts.errorGeneric}</span>
          {listing?.lastError && (
            <Button variant='outline' size='sm' className='shrink-0 rounded-full' disabled={isPending} onClick={retry}>
              <RotateCw /> {texts.retry}
            </Button>
          )}
        </div>
      )}

      <div className='sticky bottom-4 z-10'>
        {listing && pictures.length > 0 ? (
          <Button className='h-14 w-full rounded-full text-base shadow-xl shadow-primary/20' onClick={() => router.push(`/admin/listings/${listing.id}`)}>
            {texts.toDescription} <ArrowRight />
          </Button>
        ) : (
          <Button
            className='h-14 w-full rounded-full text-base shadow-xl shadow-primary/20'
            disabled={photos.length === 0 || isUploading || isPending || isMaking}
            onClick={makePictures}
          >
            {isPending || isMaking ? <Loader2 className='animate-spin' /> : <Sparkles />} {isMaking ? texts.picturesWorking : texts.makePictures}
          </Button>
        )}
      </div>
    </div>
  );
}
