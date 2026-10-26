'use client';

import { useRef, useState } from 'react';
import { Loader2, Star, Video, X } from 'lucide-react';
import ProductMedia from '@/components/ProductMedia';
import { UploadDropzone, useUploadThing } from '@/lib/uploadthing';
import { preparePhotos } from '@/lib/prepare-photos';
import { fillText, type AdminTexts } from '@/lib/marketplace/admin-texts';
import { cn } from '@/lib/utils';
import { isVideoUrl, mediaUrl } from '@/lib/video';

interface PhotoUploadProps {
  photos: string[];
  onChange: (photos: string[]) => void;
  texts: AdminTexts;
  max?: number;
  /** A service can show a short video too, kept as it is. */
  allowVideos?: boolean;
  className?: string;
}

/** One or several photos: drop or pick them, then remove one or choose the main photo (the first). */
export default function PhotoUpload({ photos, onChange, texts, max = 8, allowVideos = false, className }: PhotoUploadProps) {
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState('');
  const videoInput = useRef<HTMLInputElement>(null);
  const { startUpload: startVideoUpload } = useUploadThing('videosUploader', {
    onUploadProgress: setProgress,
    onUploadError: (uploadError) => setError(uploadError.message),
  });

  const addVideos = async (files: File[]) => {
    if (files.length === 0) return;
    setError('');
    setProgress(0);
    try {
      const uploaded = await startVideoUpload(files.slice(0, max - photos.length));
      if (uploaded) onChange([...photos, ...uploaded.map((file) => mediaUrl(file.ufsUrl, file.type))].slice(0, max));
    } finally {
      setProgress(null);
    }
  };

  const remove = (url: string) => onChange(photos.filter((photo) => photo !== url));
  const makeMain = (url: string) => onChange([url, ...photos.filter((photo) => photo !== url)]);

  return (
    <div className={cn('space-y-4', className)}>
      {photos.length > 0 && (
        <ul className='grid grid-cols-3 gap-3 sm:grid-cols-4'>
          {photos.map((url, index) => (
            <li key={url} className='group relative aspect-square overflow-hidden rounded-2xl border border-border bg-muted'>
              <ProductMedia src={url} alt='' fill />
              {/* The main picture is the cover of cards and messages, so it is never a video. */}
              {isVideoUrl(url) ? null : index === 0 ? (
                <span className='absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground'>
                  <Star className='size-3' /> {texts.mainPhoto}
                </span>
              ) : (
                <button
                  type='button'
                  onClick={() => makeMain(url)}
                  className='absolute left-2 top-2 rounded-full bg-background/90 px-2.5 py-1 text-xs opacity-0 shadow transition group-hover:opacity-100 focus-visible:opacity-100'
                >
                  {texts.makeMain}
                </button>
              )}
              <button
                type='button'
                onClick={() => remove(url)}
                aria-label={texts.removePhoto}
                className='absolute right-2 top-2 rounded-full bg-background/90 p-1.5 shadow transition hover:bg-destructive hover:text-destructive-foreground'
              >
                <X className='size-3.5' />
              </button>
            </li>
          ))}
        </ul>
      )}

      {photos.length < max && (
        // The dropzone stays mounted during the upload; unmounting it would cancel the upload.
        <div className='relative'>
          <UploadDropzone
            endpoint='photosUploader'
            onBeforeUploadBegin={async (files) => preparePhotos(files.slice(0, max - photos.length))}
            config={{ mode: 'auto' }}
            className={cn('rounded-3xl border-2 border-dashed border-border bg-card/60', photos.length > 0 ? 'py-4' : 'py-12')}
            appearance={{
              label: 'text-foreground',
              allowedContent: 'hidden',
              button: 'bg-primary text-primary-foreground px-4 rounded-full',
              uploadIcon: 'text-primary',
            }}
            content={{ label: texts.dropPhotos, button: texts.choosePhotos }}
            onUploadBegin={() => {
              setError('');
              setProgress(0);
            }}
            onUploadProgress={setProgress}
            onClientUploadComplete={(files) => {
              setProgress(null);
              onChange([...photos, ...files.map((file) => file.ufsUrl)].slice(0, max));
            }}
            onUploadError={(uploadError) => {
              setProgress(null);
              setError(uploadError.message);
            }}
          />
          {progress !== null && (
            <div className='absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-3xl bg-card/95'>
              <Loader2 className='size-6 animate-spin text-primary' />
              <p className='text-sm'>{fillText(texts.uploading, { progress })}</p>
            </div>
          )}
        </div>
      )}
      {allowVideos && photos.length < max && (
        <>
          <input
            ref={videoInput}
            type='file'
            accept='video/*'
            className='hidden'
            onChange={(event) => {
              addVideos([...(event.target.files ?? [])]);
              event.target.value = '';
            }}
          />
          <button
            type='button'
            onClick={() => videoInput.current?.click()}
            disabled={progress !== null}
            className='inline-flex items-center gap-2 text-sm font-medium text-primary underline-offset-4 hover:underline disabled:opacity-50'
          >
            <Video className='size-4' aria-hidden /> {texts.addVideo}
          </button>
          <p className='text-xs text-muted-foreground'>{texts.videoHint}</p>
        </>
      )}
      {error && <p className='text-sm text-destructive'>{error}</p>}
    </div>
  );
}
