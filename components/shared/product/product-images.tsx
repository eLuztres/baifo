'use client';
import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import ProductMedia from "@/components/ProductMedia";
import { Button } from '@/components/ui/button';
import { useI18n } from "@/components/i18n-provider";
import ImageLightbox from '@/components/shared/image-lightbox';
import { useSwipe } from '@/hooks/useSwipe';
import { prefersReducedMotion } from '@/components/shared/home/one-page';
import { RingGlassCard } from './product-ring';
import ringStyles from './product-ring.module.css';

// Long enough to really look at each view before the next one dissolves in.
const TURN_MS = 6000;
const TURN_BUTTON_CLASS =
  'size-14 rounded-full border-primary/40 text-primary hover:border-primary [&_svg]:size-6 max-sm:hidden';

interface ProductImagesProps {
  images: string[];
  alt: string;
}

const ProductImages = ({ images, alt }: ProductImagesProps) => {
  const [current, setCurrent] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isReducedMotion, setIsReducedMotion] = useState(false);
  const [fullScreenIndex, setFullScreenIndex] = useState<number | null>(null);
  const { t } = useI18n();
  const count = images.length;
  const turn = (offset: number) => setCurrent((index) => (index + offset + count) % count);
  const swipe = useSwipe({ onSwipe: turn });

  // A swipe ends on the photo too; only a real tap opens the full-screen view.
  const openFullScreen = () => {
    if (!swipe.hasSwiped()) setFullScreenIndex(current);
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
    if (count < 2 || isHovered || isReducedMotion || fullScreenIndex !== null) return;
    const timer = setInterval(() => setCurrent((index) => (index + 1) % count), TURN_MS);
    return () => clearInterval(timer);
  }, [count, isHovered, isReducedMotion, fullScreenIndex]);

  return (
    <div
      className='flex h-full flex-col-reverse gap-3 sm:flex-row sm:gap-4'
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
              <ProductMedia src={image} alt='' fill sizes='5rem' />
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
      {/* The photo takes the room it is given, as high as fits and 4:5 wide, so the page never scrolls.
          Phones are too narrow for that: there it spans the full width and is cropped to fill. */}
      <div className='flex min-h-0 min-w-0 flex-1 items-center justify-center'>
        <button
          type='button'
          className='aspect-[4/5] h-full max-w-full cursor-zoom-in rounded-[1.75rem] max-sm:aspect-auto max-sm:w-full'
          aria-label={t('IMAGE_FULLSCREEN')}
          onClick={openFullScreen}
          {...(count > 1 ? swipe.handlers : {})}
        >
          <RingGlassCard product={{ name: alt, images }} imageIndex={current} />
        </button>
      </div>
      <ImageLightbox images={images} alt={alt} index={fullScreenIndex} onIndexChange={handleFullScreenChange} />
    </div>
  );
};

export default ProductImages;
