'use client';

import { useRef, useState, type DragEvent } from 'react';
import { Camera, Loader2, Plus, Sparkles, Trash2 } from 'lucide-react';
import ProductMedia from '@/components/ProductMedia';
import VoiceInputButton from '@/components/shared/voice-input-button';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { createAdminListingPicture, saveAdminListingPictures } from '@/lib/marketplace/admin.actions';
import type { AdminTexts } from '@/lib/marketplace/admin-texts';
import { addCreated, addUpload, photoBehind, pictureCounterpart, removePicture, setAiVersion, switchVersion, type PictureSet } from '@/lib/marketplace/pictures';
import { preparePhotos } from '@/lib/prepare-photos';
import { useUploadThing } from '@/lib/uploadthing';
import { cn } from '@/lib/utils';
import { isVideoUrl, pictureOf } from '@/lib/video';
import { uploadVideos } from '@/lib/video-upload';
import ListingStage from './listing-stage';

interface PictureTabsProps {
  listingId: string;
  initial: PictureSet;
  texts: AdminTexts;
  /** Every saved change, so the other steps show the same pictures. */
  onChange: (pictures: PictureSet) => void;
}

// What editSchema takes, so the editor can save the listing later.
const MAX_PICTURES = 12;
// The empty tab where a new picture is uploaded or made.
const NEW_TAB = 'new';

/** One tab per picture: upload a photo or make one from words, change it with words, and keep the original or the AI version.
    Every change is saved at once; the AI only works when asked. */
export default function PictureTabs({ listingId, initial, texts, onChange }: PictureTabsProps) {
  const { toast } = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const [pictures, setPictures] = useState(initial);
  // The latest pictures, so answers that arrive while others are on their way build on each other.
  const latest = useRef(initial);
  const [selected, setSelected] = useState(initial.images[0] ?? NEW_TAB);
  // Each tab's own words for the AI.
  const [prompts, setPrompts] = useState<Record<string, string>>({});
  // Tabs the AI is working on, and new pictures still being made or uploaded.
  const [busy, setBusy] = useState<string[]>([]);
  const [pendingCount, setPendingCount] = useState(0);

  const { startUpload } = useUploadThing('photosUploader', {
    onUploadError: () => {
      toast({ variant: 'destructive', description: texts.uploadFailed });
    },
  });
  const { startUpload: startVideoUpload } = useUploadThing('videosUploader');

  const update = (change: (current: PictureSet) => PictureSet) => {
    const next = change(latest.current);
    latest.current = next;
    setPictures(next);
    onChange(next);
    saveAdminListingPictures(listingId, next).then((result) => {
      if (!result.success) toast({ variant: 'destructive', description: result.message });
    });
    return next;
  };

  const isNewTab = selected === NEW_TAB || !pictures.images.includes(selected);
  const shown = isNewTab ? undefined : selected;
  const pair = shown ? pictureCounterpart(pictures, shown) : undefined;
  const prompt = prompts[shown ?? NEW_TAB] ?? '';
  const setPrompt = (text: string) => setPrompts((current) => ({ ...current, [shown ?? NEW_TAB]: text }));
  const isShownBusy = Boolean(shown && busy.includes(shown));
  const canAdd = pictures.images.length + pendingCount < MAX_PICTURES;

  const addFiles = async (files: File[]) => {
    const chosen = files.slice(0, MAX_PICTURES - pictures.images.length - pendingCount);
    if (chosen.length === 0) return;
    setPendingCount((count) => count + chosen.length);
    try {
      const videos = chosen.filter((file) => file.type.startsWith('video/'));
      const photos = chosen.filter((file) => !file.type.startsWith('video/'));
      const [uploadedPhotos, uploadedVideos] = await Promise.all([
        photos.length > 0 ? startUpload(await preparePhotos(photos)) : [],
        videos.length > 0 ? uploadVideos(videos, startVideoUpload, startUpload) : [],
      ]);
      const uploaded = [...(uploadedPhotos ?? []).map((file) => file.ufsUrl), ...uploadedVideos];
      if (uploaded.length === 0) return;
      update((current) => uploaded.reduce(addUpload, current));
      setSelected(uploaded[0]);
    } catch {
      toast({ variant: 'destructive', description: texts.uploadFailed });
    } finally {
      setPendingCount((count) => count - chosen.length);
    }
  };

  const dropFiles = (event: DragEvent) => {
    event.preventDefault();
    addFiles([...event.dataTransfer.files]);
  };

  // From words alone: a new tab appears with the picture.
  const createPicture = async () => {
    const words = prompt.trim();
    if (!words) return;
    setPendingCount((count) => count + 1);
    setPrompts((current) => ({ ...current, [NEW_TAB]: '' }));
    const result = await createAdminListingPicture(listingId, words);
    setPendingCount((count) => count - 1);
    if (!('url' in result && result.url)) return toast({ variant: 'destructive', description: result.message });
    const url = result.url;
    update((current) => addCreated(current, url));
    setSelected(url);
  };

  // The tab's photo (its original, or the made picture itself) changed with its words; the new version is used.
  const changePicture = async () => {
    if (!shown) return;
    const tab = shown;
    setBusy((current) => [...current, tab]);
    const result = await createAdminListingPicture(listingId, prompt.trim() || undefined, photoBehind(latest.current, tab));
    setBusy((current) => current.filter((url) => url !== tab));
    if (!('url' in result && result.url)) return toast({ variant: 'destructive', description: result.message });
    const url = result.url;
    update((current) => setAiVersion(current, tab, url));
    setPrompts((current) => ({ ...current, [url]: current[tab] ?? '' }));
    setSelected((current) => (current === tab ? url : current));
  };

  const showOther = () => {
    if (!shown || !pair) return;
    update((current) => switchVersion(current, shown));
    setSelected(pair.other);
  };

  const remove = () => {
    if (!shown) return;
    const index = pictures.images.indexOf(shown);
    const next = update((current) => removePicture(current, shown));
    setSelected(next.images[Math.min(index, next.images.length - 1)] ?? NEW_TAB);
  };

  const hasTabs = pictures.images.length > 0 || pendingCount > 0;

  return (
    <div className='mx-auto flex w-full max-w-xl flex-col gap-4' onDragOver={(event) => event.preventDefault()} onDrop={dropFiles}>
      <input
        ref={fileInput}
        type='file'
        accept='image/*,video/*'
        multiple
        className='hidden'
        onChange={(event) => {
          addFiles([...(event.target.files ?? [])]);
          event.target.value = '';
        }}
      />

      {hasTabs && (
        <div role='tablist' aria-label={texts.photosLabel} className='flex gap-2 overflow-x-auto p-1'>
          {pictures.images.map((url, index) => {
            const isAi = Boolean(pictureCounterpart(pictures, url)?.isAi);
            return (
              <button
                key={url}
                type='button'
                role='tab'
                aria-selected={url === selected}
                aria-label={`${texts.photosLabel} ${index + 1}`}
                onClick={() => setSelected(url)}
                className={cn(
                  'relative aspect-[3/4] w-14 shrink-0 overflow-hidden rounded-2xl border-2 bg-muted transition',
                  url === selected ? 'border-primary' : 'border-transparent opacity-80 hover:opacity-100'
                )}
              >
                <ProductMedia src={pictureOf(url) ?? url} alt='' fill sizes='3.5rem' />
                {isAi && <span className='absolute bottom-1 right-1 rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground'>{texts.aiPicture}</span>}
                {busy.includes(url) && (
                  <span className='absolute inset-0 flex items-center justify-center bg-background/60'>
                    <Loader2 className='size-4 animate-spin text-primary' aria-hidden />
                  </span>
                )}
              </button>
            );
          })}
          {Array.from({ length: pendingCount }, (_, index) => (
            <span key={`pending-${index}`} className='flex aspect-[3/4] w-14 shrink-0 items-center justify-center rounded-2xl bg-muted' aria-label={texts.newPictureWorking}>
              <Loader2 className='size-4 animate-spin text-primary' aria-hidden />
            </span>
          ))}
          {canAdd && (
            <button
              type='button'
              role='tab'
              aria-selected={isNewTab}
              aria-label={texts.addPhoto}
              onClick={() => setSelected(NEW_TAB)}
              className={cn(
                'flex aspect-[3/4] w-14 shrink-0 items-center justify-center rounded-2xl border-2 border-dashed text-primary transition',
                isNewTab ? 'border-primary bg-primary/10' : 'border-border hover:border-primary'
              )}
            >
              <Plus className='size-6' aria-hidden />
            </button>
          )}
        </div>
      )}

      {shown ? (
        <>
          <ListingStage src={shown} className='mx-auto aspect-[3/4] h-[52svh] w-auto max-w-full sm:h-[60svh]'>
            <button
              type='button'
              onClick={remove}
              aria-label={texts.removePhoto}
              className='absolute right-3 top-3 flex size-9 items-center justify-center rounded-full bg-background/75 shadow backdrop-blur-sm transition hover:bg-destructive hover:text-destructive-foreground'
            >
              <Trash2 className='size-4' />
            </button>
            {pair && (
              <div role='radiogroup' aria-label={texts.photosLabel} className='absolute bottom-3 left-1/2 flex -translate-x-1/2 rounded-full bg-background/75 p-1 text-sm shadow backdrop-blur-sm'>
                {[false, true].map((isAi) => (
                  <button
                    key={String(isAi)}
                    type='button'
                    role='radio'
                    aria-checked={pair.isAi === isAi}
                    onClick={() => pair.isAi !== isAi && showOther()}
                    className={cn(
                      'flex items-center gap-1 whitespace-nowrap rounded-full px-3 py-1.5 transition-colors',
                      pair.isAi === isAi ? 'bg-primary font-medium text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {isAi && <Sparkles className='size-3.5' aria-hidden />}
                    {isAi ? texts.aiPicture : texts.original}
                  </button>
                ))}
              </div>
            )}
            {isShownBusy && (
              <div className='absolute inset-0 flex items-center justify-center gap-2 bg-background/60 text-sm font-medium backdrop-blur-sm'>
                <Loader2 className='size-5 animate-spin text-primary' aria-hidden /> {texts.newPictureWorking}
              </div>
            )}
          </ListingStage>
          {/* A video can't be changed by the AI. */}
          {!isVideoUrl(shown) && (
            <PromptBox
              id='change-prompt'
              label={texts.changePictureLabel}
              placeholder={texts.pictureIdeaOnTop}
              button={texts.changePictureButton}
              value={prompt}
              onChange={setPrompt}
              onSubmit={changePicture}
              isBusy={isShownBusy}
            />
          )}
        </>
      ) : (
        <>
          <button
            type='button'
            onClick={() => fileInput.current?.click()}
            disabled={!canAdd}
            className='flex h-44 flex-col items-center justify-center gap-2 rounded-[2rem] border-2 border-dashed border-border bg-card/50 p-4 text-center transition hover:border-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/40 sm:h-52'
          >
            <span className='flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30'>
              <Camera className='size-6' aria-hidden />
            </span>
            <span className='font-display text-xl'>{texts.takePhotoOrVideo}</span>
          </button>
          <p className='flex items-center gap-3 text-sm text-muted-foreground before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border'>{texts.orLabel}</p>
          <PromptBox
            id='create-prompt'
            label={texts.newPicture}
            placeholder={texts.createPicturePlaceholder}
            button={texts.createPictureButton}
            value={prompt}
            onChange={setPrompt}
            onSubmit={createPicture}
            isBusy={false}
            isDisabled={!prompt.trim() || !canAdd}
          />
        </>
      )}
    </div>
  );
}

interface PromptBoxProps {
  id: string;
  label: string;
  placeholder: string;
  button: string;
  value: string;
  onChange: (text: string) => void;
  onSubmit: () => void;
  isBusy: boolean;
  isDisabled?: boolean;
}

/** The words for the AI, typed or spoken, and the button that sends them. */
function PromptBox({ id, label, placeholder, button, value, onChange, onSubmit, isBusy, isDisabled = false }: PromptBoxProps) {
  return (
    <div className='space-y-2 rounded-3xl border border-border bg-card p-4'>
      <div className='flex items-center justify-between gap-3'>
        <Label htmlFor={id} className='font-display text-lg'>
          {label}
        </Label>
        <VoiceInputButton onText={(text) => onChange(value.trim() ? `${value.trimEnd()} ${text}` : text)} />
      </div>
      <Textarea
        id={id}
        rows={2}
        value={value}
        maxLength={500}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className='field-sizing-content max-h-[30svh] min-h-16 resize-none rounded-2xl bg-background text-base md:text-base'
      />
      <Button className='h-12 w-full rounded-full text-base' disabled={isBusy || isDisabled} onClick={onSubmit}>
        {isBusy ? <Loader2 className='animate-spin' /> : <Sparkles />} {button}
      </Button>
    </div>
  );
}
