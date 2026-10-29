'use client';

import { useEffect, useRef, useState, useTransition, type DragEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Camera, ImagePlus, Loader2, Sparkles, X } from 'lucide-react';
import ProductMedia from '@/components/ProductMedia';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { createAdminListing, getAdminListing, updateAdminListingPhotos, type AdminListing } from '@/lib/marketplace/admin.actions';
import { fillText, type AdminTexts } from '@/lib/marketplace/admin-texts';
import { CREATING_PARAM, type ListingType } from '@/lib/constants';
import { preparePhotos } from '@/lib/prepare-photos';
import { useUploadThing } from '@/lib/uploadthing';
import { cn } from '@/lib/utils';
import { uploadVideos } from '@/lib/video-upload';
import ListingStage from './listing-stage';
import ListingSteps from './listing-steps';

interface NewListingFormProps {
  texts: AdminTexts;
  /** A service gets retouched photos of the person instead of clean item photos. */
  type: ListingType;
  /** Back on the photos of a listing made already: its photos are changed instead of a new listing made. */
  listing?: AdminListing;
  /** The listing with its new photos, back on the description. */
  onDone?: (listing: AdminListing) => void;
}

// What the photosUploader route takes at once; a service's videos count too.
const MAX_PHOTOS = 8;

const isVideo = (file: File) => file.type.startsWith('video/');

type QueuedStep = 'ai' | 'asIs';

/** Step 1: only the photos. One tap starts the AI pictures and goes straight on to the description, where they show up. */
export default function NewListingForm({ texts, type, listing, onDone }: NewListingFormProps) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<string[]>(listing?.rawImages ?? []);
  const [shownIndex, setShownIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  // Files still on their way to UploadThing: the admin can pick more or choose the next step meanwhile.
  const [pendingCount, setPendingCount] = useState(0);
  // The next step chosen during an upload; it runs by itself once every photo is up.
  const [queuedStep, setQueuedStep] = useState<QueuedStep | null>(null);
  // After each photo: another one, or straight on to the AI? Asked right away, so nothing needs scrolling.
  const [isAskingMore, setIsAskingMore] = useState(false);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const uploadEvents = {
    onUploadProgress: setProgress,
    onUploadError: (uploadError: Error) => {
      setError(uploadError.message);
      setQueuedStep(null);
    },
  };
  const { startUpload } = useUploadThing('photosUploader', uploadEvents);
  // Videos stay as they are next to the AI pictures; each one carries a still frame for its cover.
  const { startUpload: startVideoUpload } = useUploadThing('videosUploader', uploadEvents);
  // A service can go on without AI, with its photos and videos as they are.
  const canSkipAi = type === 'SERVICE';
  // An event's picture is the organiser's own (a poster, a photo): it is used as it is, no AI pictures.
  const isEvent = type === 'EVENT';

  const isUploading = pendingCount > 0;

  const addPhotos = async (files: File[]) => {
    const free = MAX_PHOTOS - photos.length - pendingCount;
    if (files.length === 0 || free <= 0 || isPending) return;
    const chosen = files.slice(0, free);
    setError('');
    setProgress(0);
    setPendingCount((count) => count + chosen.length);
    setIsAskingMore(true);
    try {
      const videos = chosen.filter(isVideo);
      const photoFiles = chosen.filter((file) => !isVideo(file));
      const [uploadedPhotos, uploadedVideos] = await Promise.all([
        photoFiles.length > 0 ? startUpload(await preparePhotos(photoFiles)) : [],
        videos.length > 0 ? uploadVideos(videos, startVideoUpload, startUpload) : [],
      ]);
      const uploaded = [...(uploadedPhotos ?? []).map((file) => file.ufsUrl), ...uploadedVideos];
      if (uploaded.length > 0) setPhotos((current) => [...current, ...uploaded].slice(0, MAX_PHOTOS));
      else setQueuedStep(null);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : texts.errorGeneric);
      setQueuedStep(null);
    } finally {
      setPendingCount((count) => count - chosen.length);
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

  // Straight on to the description: the AI makes the pictures meanwhile, and they appear there.
  // useAi false: the photos and videos stay as they are (a video's still is the cover wherever it can't play).
  const createListing = (chosen: string[], useAi: boolean) =>
    startTransition(async () => {
      setError('');
      if (listing) return savePhotos(listing, chosen, useAi);
      const result = await createAdminListing({ photos: chosen, type, useAi });
      if (!('id' in result && result.id)) return setError(result.message);
      router.push(`/admin/listings/${result.id}?${CREATING_PARAM}=1`);
    });

  // Nothing changed: straight back, the AI pictures made already stay.
  const savePhotos = async (current: AdminListing, chosen: string[], useAi: boolean) => {
    const isUnchanged = useAi === current.usesAi && chosen.join() === current.rawImages.join();
    if (!isUnchanged) {
      const result = await updateAdminListingPhotos(current.id, { photos: chosen, useAi });
      if (!result.success) return setError(result.message);
    }
    onDone?.((isUnchanged ? current : await getAdminListing(current.id)) ?? current);
  };

  // No photo at all: the AI makes the picture from the description.
  const startWithoutPhoto = () => createListing([], true);

  const runStep = (step: QueuedStep) => createListing(photos, step === 'ai');
  // Chosen while photos still upload: wait for them, then go on with all of them.
  const chooseStep = (step: QueuedStep) => (isUploading ? setQueuedStep(step) : runStep(step));

  useEffect(() => {
    if (!queuedStep || isUploading) return;
    setQueuedStep(null);
    runStep(queuedStep);
    // runStep only changes with the photos, which are complete once isUploading turns false.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queuedStep, isUploading]);

  // The description step: like the main button, but a listing made already keeps its choice of AI pictures or none.
  const goToDescription = () => {
    if (photos.length === 0 && !isUploading) return startWithoutPhoto();
    const keepsPhotosAsIs = listing ? !listing.usesAi : isEvent;
    chooseStep(keepsPhotosAsIs ? 'asIs' : 'ai');
  };

  const stageSource = photos[shownIndex] ?? photos[0];

  return (
    <>
      <ListingSteps current={0} texts={texts} onSelect={isPending || queuedStep ? undefined : goToDescription} />
      <div className='mx-auto flex w-full max-w-xl flex-col gap-4'>
        <input
          ref={fileInput}
          type='file'
          accept='image/*,video/*'
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
              <span className='font-display text-2xl'>{texts.takePhotoOrVideo}</span>
              <span className='hidden text-sm text-muted-foreground sm:block'>{texts.dropHere}</span>
              <span className='text-xs text-muted-foreground'>{texts.videoHint}</span>
            </button>
          )}
          {isUploading && photos.length === 0 && (
            <div className='absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/80 backdrop-blur-sm'>
              <Loader2 className='size-8 animate-spin text-primary' />
              <p className='text-sm font-medium'>{fillText(texts.uploading, { progress })}</p>
            </div>
          )}
        </ListingStage>

        {(photos.length > 0 || isUploading) && (
          <ul className='flex gap-3 overflow-x-auto p-1'>
            {photos.map((url, index) => (
              <li key={`${index}-${url}`} className='relative shrink-0'>
                <button
                  type='button'
                  onClick={() => setShownIndex(index)}
                  aria-pressed={index === shownIndex}
                  aria-label={`${texts.photosLabel} ${index + 1}`}
                  className={cn('relative block size-16 overflow-hidden rounded-2xl border-2 bg-muted', index === shownIndex ? 'border-primary' : 'border-transparent')}
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
            {Array.from({ length: pendingCount }, (_, index) => (
              <li key={`pending-${index}`} className='flex size-16 shrink-0 items-center justify-center rounded-2xl bg-muted' aria-label={texts.uploadingPhotos}>
                <Loader2 className='size-5 animate-spin text-primary' />
              </li>
            ))}
            {photos.length + pendingCount < MAX_PHOTOS && (
              <li className='shrink-0'>
                <button
                  type='button'
                  onClick={pickPhotos}
                  aria-label={texts.addPhoto}
                  className='flex size-16 items-center justify-center rounded-2xl border-2 border-dashed border-border text-muted-foreground transition hover:border-primary hover:text-primary'
                >
                  <ImagePlus className='size-5' />
                </button>
              </li>
            )}
          </ul>
        )}

        {error && (
          <p role='alert' className='rounded-2xl border border-destructive/40 p-3 text-sm text-destructive'>
            {error}
          </p>
        )}

        <Drawer open={isAskingMore} onOpenChange={setIsAskingMore}>
          <DrawerContent>
            <DrawerHeader className='items-center text-center'>
              <DrawerTitle className='font-display text-2xl'>{texts.anotherPhotoTitle}</DrawerTitle>
              <DrawerDescription>{fillText(texts.anotherPhotoCount, { count: photos.length + pendingCount, max: MAX_PHOTOS })}</DrawerDescription>
            </DrawerHeader>
            <ul className='flex justify-center gap-2 overflow-x-auto px-4'>
              {photos.map((url) => (
                <li key={url} className='relative size-14 shrink-0 overflow-hidden rounded-xl bg-muted'>
                  <ProductMedia src={url} alt='' fill sizes='3.5rem' />
                </li>
              ))}
              {Array.from({ length: pendingCount }, (_, index) => (
                <li key={`pending-${index}`} className='flex size-14 shrink-0 items-center justify-center rounded-xl bg-muted' aria-label={texts.uploadingPhotos}>
                  <Loader2 className='size-4 animate-spin text-primary' />
                </li>
              ))}
            </ul>
            <div className='grid grid-cols-2 gap-3 p-4 pb-8'>
              <Button
                variant='outline'
                className='h-14 rounded-full text-base'
                disabled={photos.length + pendingCount >= MAX_PHOTOS}
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
                  chooseStep(isEvent ? 'asIs' : 'ai');
                }}
              >
                {isEvent ? <ArrowRight /> : <Sparkles />} {isEvent ? texts.usePhotos : texts.anotherPhotoNo}
              </Button>
              {/* An event's main choice already keeps the photos as they are. */}
              {!isEvent && (
                <Button
                  variant='ghost'
                  className='col-span-2 h-auto min-h-10 whitespace-normal rounded-full'
                  disabled={isPending}
                  onClick={() => {
                    setIsAskingMore(false);
                    chooseStep('asIs');
                  }}
                >
                  <ArrowRight /> {canSkipAi ? texts.withoutAi : texts.continueAsIs}
                </Button>
              )}
            </div>
          </DrawerContent>
        </Drawer>

        <div className='sticky bottom-4 z-10'>
          {photos.length === 0 && !isUploading ? (
            <div className='space-y-2 text-center'>
              <Button
                variant='outline'
                className='h-14 w-full rounded-full bg-background text-base shadow-xl shadow-primary/10'
                disabled={isPending}
                onClick={startWithoutPhoto}
              >
                {isPending ? <Loader2 className='animate-spin' /> : <Sparkles />} {texts.noPhoto}
              </Button>
              <p className='text-xs text-muted-foreground'>{texts.noPhotoHint}</p>
            </div>
          ) : (
            <div className='space-y-2'>
              <Button
                className='h-14 w-full rounded-full text-base shadow-xl shadow-primary/20'
                disabled={isPending || Boolean(queuedStep)}
                onClick={() => chooseStep(isEvent ? 'asIs' : 'ai')}
              >
                {isPending || queuedStep ? <Loader2 className='animate-spin' /> : isEvent ? <ArrowRight /> : <Sparkles />}{' '}
                {queuedStep ? texts.uploadingPhotos : isEvent ? texts.usePhotos : texts.makePictures}
              </Button>
              {canSkipAi && !queuedStep && (
                <Button variant='outline' className='h-12 w-full rounded-full bg-background' disabled={isPending} onClick={() => chooseStep('asIs')}>
                  {texts.withoutAi}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
