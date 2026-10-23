'use client';

import { useState } from 'react';
import Image from 'next/image';
import ImageLightbox from '@/components/shared/image-lightbox';
import { useI18n } from '@/components/i18n-provider';

interface WorkshopGalleryProps {
  images: string[];
  /** Describes every photo; the viewer also shows it as its title for screen readers. */
  alt: string;
  className?: string;
}

/** The workshop's row of small photos; a tap opens one full screen. */
const WorkshopGallery = ({ images, alt, className }: WorkshopGalleryProps) => {
  const { t } = useI18n();
  const [fullScreenIndex, setFullScreenIndex] = useState<number | null>(null);

  return (
    <>
      <ul className={className}>
        {images.map((src, index) => (
          <li key={src} className='relative aspect-square h-full shrink-0 snap-start overflow-hidden rounded-xl border border-border'>
            <button
              type='button'
              className='absolute inset-0 cursor-zoom-in'
              aria-label={`${t('IMAGE_FULLSCREEN')} ${index + 1}`}
              onClick={() => setFullScreenIndex(index)}
            >
              <Image src={src} alt={alt} fill sizes='9rem' className='object-cover transition duration-500 hover:scale-105' />
            </button>
          </li>
        ))}
      </ul>
      <ImageLightbox images={images} alt={alt} index={fullScreenIndex} onIndexChange={setFullScreenIndex} />
    </>
  );
};

export default WorkshopGallery;
