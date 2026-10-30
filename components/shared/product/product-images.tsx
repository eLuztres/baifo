'use client';
import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import ProductMedia from "@/components/ProductMedia";
import { Button } from '@/components/ui/button';
import { useI18n } from "@/components/i18n-provider";
import ImageLightbox from '@/components/shared/image-lightbox';
import { useSwipe } from '@/hooks/useSwipe';
import { prefersReducedMotion } from '@/components/shared/home/one-page';
import { isVideoUrl } from '@/lib/video';
import { playFullScreen } from '@/lib/video-full-screen';
import AiPictureMark from './ai-picture-mark';
import BrandStamp from './brand-stamp';
import { RingGlassCard } from './product-ring';
import ringStyles from './product-ring.module.css';

// Long enough to really look at each view before the next one dissolves in.
const TURN_MS = 6000;
const TURN_BUTTON_CLASS =
  'size-14 rounded-full border-primary/40 text-primary hover:border-primary [&_svg]:size-6 max-sm:hidden';

interface ProductImagesProps {
  images: string[];
  alt: string;
  /** The shop's mark on the pictures (items for sale only). */
  stamp?: string;
  /** Set when the AI made the pictures: what their small mark says. */
  aiLabel?: string;
}

const ProductImages = ({ images, alt, stamp, aiLabel }: ProductImagesProps) => {
  const [current, setCurrent] = useState(0);
  const [phoneIndex, setPhoneIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isReducedMotion, setIsReducedMotion] = useState(false);
  const [fullScreenIndex, setFullScreenIndex] = useState<number | null>(null);
  const { t } = useI18n();
  const count = images.length;
  const turn = (offset: number) => setCurrent((index) => (index + offset + count) % count);
  const swipe = useSwipe({ onSwipe: turn });

  const cardRef = useRef<HTMLDivElement>(null);
  const isVideoShown = isVideoUrl(images[current] ?? '');

  // A swipe ends on the photo too; only a real tap opens the full-screen view.
  const openFullScreen = () => {
    if (swipe.hasSwiped()) return;
    // The video already playing goes full screen itself: it goes on from what it has loaded instead of starting over.
    const video = isVideoShown ? cardRef.current?.querySelector<HTMLVideoElement>('[data-active] > div:last-child video') : null;
    if (video && playFullScreen(video)) return;
    setFullScreenIndex(current);
  };

  // On phones a video tile goes full screen itself too; photos open the viewer.
  const openTile = (index: number, tile: HTMLElement) => {
    const video = isVideoUrl(images[index]) ? tile.querySelector('video') : null;
    if (video && playFullScreen(video)) return;
    setFullScreenIndex(index);
  };

  // Closing the viewer keeps the photo that was looked at last.
  const handleFullScreenChange = (index: number | null) => {
    if (index !== null) setCurrent(index);
    setFullScreenIndex(index);
  };

  useEffect(() => {
    setIsReducedMotion(prefersReducedMotion());
  }, []);

  // The views follow each other quietly until the visitor takes over.
  useEffect(() => {
    // A video plays to the end instead of being turned away after a few seconds.
    if (count < 2 || isHovered || isReducedMotion || fullScreenIndex !== null || isVideoShown) return;
    const timer = setInterval(() => setCurrent((index) => (index + 1) % count), TURN_MS);
    return () => clearInterval(timer);
  }, [count, isHovered, isReducedMotion, fullScreenIndex, isVideoShown]);

  return (
    <>
      {/* Phones: the photos full width, one at a time, swiped sideways; a tap opens one full screen. */}
      <div className='relative aspect-[3/4] sm:hidden'>
        <div
          className='flex size-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none]'
          onScroll={(event) => setPhoneIndex(Math.round(event.currentTarget.scrollLeft / event.currentTarget.clientWidth))}
        >
          {images.map((image, index) => (
            <button
              type='button'
              key={image}
              onClick={(event) => openTile(index, event.currentTarget)}
              aria-label={t('SHOW_IMAGE', { n: index + 1 })}
              className='relative size-full shrink-0 snap-center'
            >
              <ProductMedia src={image} alt={index === 0 ? alt : ''} fill sizes='100vw' priority={index === 0} className='object-contain' playsWhenVisible />
              {aiLabel && <AiPictureMark label={aiLabel} className='absolute bottom-3 right-3' />}
              {/* Beside the AI mark, which takes the corner. */}
              <BrandStamp src={stamp} className={cn('bottom-3 right-3', aiLabel && 'right-11')} />
            </button>
          ))}
        </div>
        {count > 1 && (
          <div aria-hidden='true' className='pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-full bg-background/60 px-2 py-1.5 backdrop-blur-sm'>
            {images.map((image, index) => (
              <span key={image} className={cn('size-1.5 rounded-full transition-colors', index === phoneIndex ? 'bg-foreground' : 'bg-foreground/35')} />
            ))}
          </div>
        )}
      </div>
      <div
        className='flex h-full flex-col-reverse gap-3 max-sm:hidden sm:flex-row sm:gap-4'
        onPointerEnter={() => setIsHovered(true)}
        onPointerLeave={() => setIsHovered(false)}
      >
        {count > 1 && (
          <div className='flex shrink-0 flex-wrap items-center justify-center gap-3 sm:flex-col sm:flex-nowrap sm:self-center'>
            <Button
              variant='outline'
              size='icon'
              className={TURN_BUTTON_CLASS}
              aria-label={t('RING_PHOTO_PREVIOUS')}
              onClick={() => turn(-1)}
            >
              <ChevronUp />
            </Button>
            {images.map((image, index) => (
              <button
                type='button'
                key={image}
                onClick={() => setCurrent(index)}
                aria-label={t('SHOW_IMAGE', { n: index + 1 })}
                aria-current={index === current || undefined}
                className={cn(ringStyles.thumb, index === current && ringStyles.thumbActive)}
              >
                <ProductMedia src={image} alt='' fill sizes='5rem' isStill />
              </button>
            ))}
            <Button
              variant='outline'
              size='icon'
              className={TURN_BUTTON_CLASS}
              aria-label={t('RING_PHOTO_NEXT')}
              onClick={() => turn(1)}
            >
              <ChevronDown />
            </Button>
          </div>
        )}
        {/* The photo takes the room it is given, as high as fits and 3:4 wide, so the page never scrolls. */}
        <div className='flex min-h-0 min-w-0 flex-1 items-center justify-center'>
          <button
            type='button'
            className='relative aspect-[3/4] h-full max-w-full cursor-zoom-in rounded-[1.75rem]'
            aria-label={t('IMAGE_FULLSCREEN')}
            onClick={openFullScreen}
            {...(count > 1 ? swipe.handlers : {})}
          >
            <div ref={cardRef} className='contents'>
              <RingGlassCard product={{ name: alt, images }} imageIndex={current} playsWhenVisible />
            </div>
            {aiLabel && <AiPictureMark label={aiLabel} className='absolute bottom-3 right-3 size-8 [&_svg]:size-4' />}
            <BrandStamp src={stamp} className={cn('bottom-4 right-4', aiLabel && 'bottom-[1.1rem] right-13')} />
          </button>
        </div>
      </div>
      <ImageLightbox images={images} alt={alt} index={fullScreenIndex} onIndexChange={handleFullScreenChange} />
    </>
  );
};

export default ProductImages;
