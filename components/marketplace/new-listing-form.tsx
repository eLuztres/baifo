'use client';

import { useEffect, useRef, useState, useTransition, type DragEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Camera, ImagePlus, Loader2, RotateCw, Sparkles, X } from 'lucide-react';
import ProductMedia from '@/components/ProductMedia';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import {
  createAdminListing,
  getAdminListing,
  retryAdminListing,
  swapListingPicture,
  type AdminListing,
  type NewListingInput,
} from '@/lib/marketplace/admin.actions';
import { fillText, type AdminTexts } from '@/lib/marketplace/admin-texts';
import { pictureCounterpart } from '@/lib/marketplace/pictures';
import { preparePhotos } from '@/lib/prepare-photos';
import { useUploadThing } from '@/lib/uploadthing';
import { cn } from '@/lib/utils';
import ListingStage from './listing-stage';

interface NewListingFormProps {
  texts: AdminTexts;
  /** A service gets retouched photos of the person instead of clean item photos; a wanted ad usually has no photo at all. */
  kind: NonNullable<NewListingInput['kind']>;
}

// What the photosUploader route takes at once.
const MAX_PHOTOS = 8;
const POLL_MS = 2500;

/** Step 1: only the photos. One tap makes the AI pictures, and they show up right here. */
export default function NewListingForm({ texts, kind }: NewListingFormProps) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [listing, setListing] = useState<AdminListing | null>(null);
  const [shownIndex, setShownIndex] = useState(0);
  const [progress, setProgress] = useState<number | null>(null);
  // After each photo: another one, or straight on to the AI? Asked right away, so nothing needs scrolling.
  const [isAskingMore, setIsAskingMore] = useState(false);
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
      if (uploaded) {
        setPhotos((current) => [...current, ...uploaded.map((file) => file.ufsUrl)].slice(0, MAX_PHOTOS));
        setIsAskingMore(true);
      }
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
      const result = await createAdminListing({ photos, kind });
      if (!('id' in result && result.id)) return setError(result.message);
      const created = await getAdminListing(result.id);
      if (created) setListing(created);
      setShownIndex(0);
    });

  // No photo at all: straight to the description, from which the AI makes the picture.
  const startWithoutPhoto = () =>
    startTransition(async () => {
      setError('');
      const result = await createAdminListing({ photos: [], kind });
      if (!('id' in result && result.id)) return setError(result.message);
      router.push(`/admin/listings/${result.id}`);
    });

  const retry = () =>
    listing &&
    startTransition(async () => {
      await retryAdminListing(listing.id);
      setListing({ ...listing, lastError: null });
    });

  // Before the AI: the chosen photo. After: the version in use of each picture, AI or original.
  const thumbnails = pictures.length > 0 ? pictures : photos;
  const stageSource = pictures.length > 0 ? pictures[shownIndex] : photos[shownIndex] ?? photos[0];
  const versionOf = (url: string) => (listing ? pictureCounterpart(listing, url) : undefined);
  const shownVersion = pictures.length > 0 ? versionOf(stageSource) : undefined;

  // Shown at once and saved right after; a failed save puts the picture back.
  const choosePicture = async (url: string) => {
    if (!listing) return;
    const version = versionOf(url);
    if (!version) return;
    const before = listing;
    setListing({ ...listing, images: listing.images.map((image) => (image === url ? version.other : image)) });
    const result = await swapListingPicture(listing.id, url);
    if (!result.success) {
      setListing(before);
      setError(result.message);
    }
  };

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
        {/* For every picture its own choice: the original photo or the AI picture, whichever looks better. */}
        {shownVersion && (
          <div
            role='radiogroup'
            aria-label={texts.photosLabel}
            className='absolute inset-x-0 bottom-3 mx-auto flex w-fit rounded-full bg-background/90 p-1 shadow-lg backdrop-blur'
          >
            {[
              { isAi: false, icon: Camera, label: texts.original, title: texts.useOriginalPicture },
              { isAi: true, icon: Sparkles, label: texts.aiPicture, title: texts.useAiPicture },
            ].map(({ isAi, icon: Icon, label, title }) => {
              const isChecked = isAi === shownVersion.isAi;
              return (
                <button
                  key={label}
                  type='button'
                  role='radio'
                  aria-checked={isChecked}
                  title={title}
                  onClick={() => !isChecked && choosePicture(stageSource)}
                  className={cn(
                    'flex min-w-28 items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors',
                    isChecked ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Icon className='size-4' aria-hidden /> {label}
                </button>
              );
            })}
          </div>
        )}
      </ListingStage>

      {thumbnails.length > 0 && (
        <ul className='flex gap-3 overflow-x-auto p-1'>
          {thumbnails.map((url, index) => (
            <li key={`${index}-${url}`} className='relative shrink-0'>
              <button
                type='button'
                onClick={() => setShownIndex(index)}
                aria-pressed={index === shownIndex}
                aria-label={`${texts.photosLabel} ${index + 1}`}
                className={cn('relative block size-16 overflow-hidden rounded-2xl border-2 bg-muted', index === shownIndex ? 'border-primary' : 'border-transparent')}
              >
                <ProductMedia src={url} alt='' fill sizes='4rem' />
                {versionOf(url) && (
                  <span className='absolute bottom-1 right-1 flex size-5 items-center justify-center rounded-full bg-background/90 text-primary shadow'>
                    {versionOf(url)?.isAi ? <Sparkles className='size-3' aria-label={texts.aiPicture} /> : <Camera className='size-3' aria-label={texts.original} />}
                  </span>
                )}
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

      <Drawer open={isAskingMore && !listing} onOpenChange={setIsAskingMore}>
        <DrawerContent>
          <DrawerHeader className='items-center text-center'>
            <DrawerTitle className='font-display text-2xl'>{texts.anotherPhotoTitle}</DrawerTitle>
            <DrawerDescription>{fillText(texts.anotherPhotoCount, { count: photos.length, max: MAX_PHOTOS })}</DrawerDescription>
          </DrawerHeader>
          <ul className='flex justify-center gap-2 overflow-x-auto px-4'>
            {photos.map((url) => (
              <li key={url} className='relative size-14 shrink-0 overflow-hidden rounded-xl bg-muted'>
                <ProductMedia src={url} alt='' fill sizes='3.5rem' />
              </li>
            ))}
          </ul>
          <div className='grid grid-cols-2 gap-3 p-4 pb-8'>
            <Button
              variant='outline'
              className='h-14 rounded-full text-base'
              disabled={photos.length >= MAX_PHOTOS}
              onClick={() => {
                setIsAskingMore(false);
                pickPhotos();
              }}
            >
              <Camera /> {texts.anotherPhotoYes}
            </Button>
            <Button
              className='h-14 rounded-full text-base shadow-xl shadow-primary/20'
              onClick={() => {
                setIsAskingMore(false);
                makePictures();
              }}
            >
              <Sparkles /> {texts.anotherPhotoNo}
            </Button>
          </div>
        </DrawerContent>
      </Drawer>

      <div className='sticky bottom-4 z-10'>
        {listing && pictures.length > 0 ? (
          <Button className='h-14 w-full rounded-full text-base shadow-xl shadow-primary/20' onClick={() => router.push(`/admin/listings/${listing.id}`)}>
            {texts.toDescription} <ArrowRight />
          </Button>
        ) : photos.length === 0 ? (
          <div className='space-y-2 text-center'>
            <Button
              variant={kind === 'wanted' ? 'default' : 'outline'}
              className={cn('h-14 w-full rounded-full text-base shadow-xl', kind === 'wanted' ? 'shadow-primary/20' : 'bg-background shadow-primary/10')}
              disabled={isUploading || isPending}
              onClick={startWithoutPhoto}
            >
              {isPending ? <Loader2 className='animate-spin' /> : <Sparkles />} {texts.noPhoto}
            </Button>
            <p className='text-xs text-muted-foreground'>{texts.noPhotoHint}</p>
          </div>
        ) : (
          <Button
            className='h-14 w-full rounded-full text-base shadow-xl shadow-primary/20'
            disabled={isUploading || isPending || isMaking}
            onClick={makePictures}
          >
            {isPending || isMaking ? <Loader2 className='animate-spin' /> : <Sparkles />} {isMaking ? texts.picturesWorking : texts.makePictures}
          </Button>
        )}
      </div>
    </div>
  );
}
