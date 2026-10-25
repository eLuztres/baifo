'use client';

import { KeyboardEvent, useRef, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from 'lucide-react';
import ProductMedia from '@/components/ProductMedia';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/components/i18n-provider';
import { useSwipe } from '@/hooks/useSwipe';
import { cn } from '@/lib/utils';
import styles from './image-lightbox.module.css';
import { usePhotoZoom } from './use-photo-zoom';

export interface ImageCaption {
  eyebrow?: string;
  title: string;
  text?: string;
}

interface ImageLightboxProps {
  images: string[];
  alt: string;
  /** Shown over the bottom of the photo with the same index, like the description on a card. */
  captions?: ImageCaption[];
  /** The photo shown full screen; null keeps the viewer closed. */
  index: number | null;
  onIndexChange: (index: number | null) => void;
}

const ROUND_BUTTON_CLASS = 'size-12 rounded-full bg-background/70 backdrop-blur-md [&_svg]:size-6';
const KEY_DIRECTIONS: Partial<Record<string, -1 | 1>> = { ArrowLeft: -1, ArrowRight: 1 };

/** Full-screen view of one or more photos: X, Escape or the back gesture closes it; arrows, keys or a swipe browse. */
const ImageLightbox = ({ images, alt, captions, index, onIndexChange }: ImageLightboxProps) => {
  const { t } = useI18n();
  const count = images.length;
  const caption = index !== null ? captions?.[index] : undefined;
  // Only a turn cross-fades; the photo the viewer opens with shows at once.
  const [hasTurned, setHasTurned] = useState(false);
  const zoom = usePhotoZoom();
  const turn = (direction: number) => {
    if (index === null) return;
    setHasTurned(true);
    zoom.reset();
    onIndexChange((index + direction + count) % count);
  };
  const { handlers } = useSwipe({ onSwipe: turn });
  // Opened from code, not a Radix trigger, so Radix doesn't know where focus has to go back to.
  const returnFocusRef = useRef<HTMLElement | null>(null);

  const handleKeyDown = (event: KeyboardEvent) => {
    const direction = KEY_DIRECTIONS[event.key];
    if (direction && count > 1) turn(direction);
  };

  return (
    <DialogPrimitive.Root open={index !== null} onOpenChange={(isOpen) => {
        if (isOpen) return;
        setHasTurned(false);
        zoom.reset();
        onIndexChange(null);
      }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Content
          aria-describedby={undefined}
          onKeyDown={handleKeyDown}
          onOpenAutoFocus={() => {
            returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            returnFocusRef.current?.focus();
          }}
          // While zoomed in, a swipe moves the photo instead of turning to the next one.
          {...(count > 1 && !zoom.isZoomed ? handlers : {})}
          className='fixed inset-0 z-50 flex items-center justify-center overscroll-contain bg-background/95 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0'
        >
          <DialogPrimitive.Title className='sr-only'>{caption?.title ?? alt}</DialogPrimitive.Title>

          <div
            ref={zoom.frameRef}
            className={cn('relative size-full touch-none select-none', zoom.isZoomed ? 'cursor-grab active:cursor-grabbing' : 'cursor-zoom-in')}
            style={zoom.style}
            {...zoom.handlers}
          >
            {images.map((image, imageIndex) => (
              <div key={image} className={cn(styles.photo, hasTurned && styles.photoFade, imageIndex === index && styles.photoActive)} aria-hidden={imageIndex !== index}>
                <ProductMedia src={image} alt={captions?.[imageIndex]?.title ?? alt} fill sizes='100vw' className='object-contain' />
              </div>
            ))}
          </div>

          {caption && (
            <div
              key={caption.title}
              className='absolute inset-x-0 bottom-0 space-y-2 bg-gradient-to-t from-black/90 via-black/75 to-transparent px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-24 text-center text-white animate-in fade-in duration-300 sm:space-y-3 sm:px-10 sm:pb-12'
            >
              {caption.eyebrow && <p className='eyebrow'>{caption.eyebrow}</p>}
              <p className='font-display text-3xl sm:text-5xl 2xl:text-6xl'>{caption.title}</p>
              {caption.text && <p className='mx-auto max-w-3xl text-lg leading-relaxed text-white/90 sm:text-2xl 2xl:max-w-4xl 2xl:text-3xl'>{caption.text}</p>}
            </div>
          )}

          {count > 1 && index !== null && (
            <>
              <Button
                variant='outline'
                size='icon'
                className={cn(ROUND_BUTTON_CLASS, 'absolute left-[max(1rem,env(safe-area-inset-left))] top-1/2 -translate-y-1/2')}
                aria-label={t('IMAGE_PREVIOUS')}
                onClick={() => turn(-1)}
              >
                <ChevronLeft />
              </Button>
              <Button
                variant='outline'
                size='icon'
                className={cn(ROUND_BUTTON_CLASS, 'absolute right-[max(1rem,env(safe-area-inset-right))] top-1/2 -translate-y-1/2')}
                aria-label={t('IMAGE_NEXT')}
                onClick={() => turn(1)}
              >
                <ChevronRight />
              </Button>
              {/* With a caption at the bottom, the counter moves up next to the X. */}
              <p
                className={cn(
                  'absolute left-1/2 -translate-x-1/2 rounded-full',
                  caption ? 'top-[max(1.75rem,calc(env(safe-area-inset-top)+0.75rem))]' : 'bottom-[max(1.5rem,env(safe-area-inset-bottom))]',
                  'bg-background/70 px-3 py-1 text-sm tabular-nums text-muted-foreground'
                )}
              >
                {index + 1} / {count}
              </p>
            </>
          )}

          <Button
            variant='outline'
            size='icon'
            className={cn(ROUND_BUTTON_CLASS, 'absolute right-[calc(max(1rem,env(safe-area-inset-right))+3.5rem)] top-[max(1rem,env(safe-area-inset-top))]')}
            aria-label={t(zoom.isZoomed ? 'IMAGE_ZOOM_OUT' : 'IMAGE_ZOOM_IN')}
            onClick={zoom.toggle}
          >
            {zoom.isZoomed ? <ZoomOut /> : <ZoomIn />}
          </Button>

          <DialogPrimitive.Close asChild>
            <Button
              variant='outline'
              size='icon'
              className={cn(ROUND_BUTTON_CLASS, 'absolute right-[max(1rem,env(safe-area-inset-right))] top-[max(1rem,env(safe-area-inset-top))]')}
              aria-label={t('CLOSE')}
            >
              <X />
            </Button>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};

export default ImageLightbox;
