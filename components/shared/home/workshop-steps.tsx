'use client';

import { useState } from 'react';
import Image from 'next/image';
import ImageLightbox, { type ImageCaption } from '@/components/shared/image-lightbox';
import { useI18n } from '@/components/i18n-provider';

export interface WorkshopStepCard {
  image: string;
  title: string;
  text: string;
}

interface WorkshopStepsProps {
  steps: WorkshopStepCard[];
  className?: string;
}

/** The workshop's steps (three or four) as photo cards with their title and description; a tap on the photo shows it full screen. */
const WorkshopSteps = ({ steps, className }: WorkshopStepsProps) => {
  const { t } = useI18n();
  const [fullScreenIndex, setFullScreenIndex] = useState<number | null>(null);
  const captions: ImageCaption[] = steps.map((step, index) => ({
    eyebrow: String(index + 1).padStart(2, '0'),
    title: step.title,
    text: step.text,
  }));

  return (
    <>
      <ol className={className}>
        {steps.map((step, index) => (
          <li
            key={step.title}
            className='relative w-[78%] shrink-0 snap-start overflow-hidden rounded-2xl border border-border md:w-auto'
          >
            {/* The button covers the card; the text over it lets taps through, since a heading can't sit inside a button. */}
            <button
              type='button'
              className='absolute inset-0 cursor-zoom-in'
              aria-label={`${t('IMAGE_FULLSCREEN')}: ${step.title}`}
              onClick={() => setFullScreenIndex(index)}
            >
              {/* Anchored high: the text covers the bottom, so a wide card crops mostly there and doesn't cut off heads. */}
              <Image src={step.image} alt={step.title} fill sizes={`(min-width: 768px) ${Math.ceil(100 / steps.length)}vw, 78vw`} className='object-cover object-[50%_30%]' />
            </button>
            <div className='pointer-events-none absolute inset-x-0 bottom-0 space-y-1 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-4 pt-16 text-white sm:p-6 sm:pt-20'>
              <p className='eyebrow'>{captions[index].eyebrow}</p>
              <h3 className='text-xl sm:text-2xl'>{step.title}</h3>
              <p className='line-clamp-3 text-sm text-white/85 sm:text-base'>{step.text}</p>
            </div>
          </li>
        ))}
      </ol>
      <ImageLightbox
        images={steps.map((step) => step.image)}
        alt={t('WORKSHOP_TITLE')}
        captions={captions}
        index={fullScreenIndex}
        onIndexChange={setFullScreenIndex}
      />
    </>
  );
};

export default WorkshopSteps;
