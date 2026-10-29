import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { OfferItem } from '@/lib/offers-core';
import { cn } from '@/lib/utils';
import OfferIcon from './offer-icon';

export type { OfferItem };

interface OfferCardProps extends OfferItem {
  linkLabel: string;
  className?: string;
}

/** One offer, big and lit: its picture or icon, who it's for, the title, the text, until when it runs and its button. */
const OfferCard = ({ offer, untilLabel, linkLabel, className }: OfferCardProps) => {
  const isExternal = offer.linkUrl?.startsWith('https://');
  return (
    <article className={cn('flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6', className)}>
      {offer.image ? (
        <div
          className='relative aspect-[3/4] w-full max-w-xs shrink-0 overflow-hidden rounded-2xl bg-muted shadow-lg shadow-primary/25 sm:w-56'
        >
          <Image src={offer.image} alt='' fill sizes='(min-width: 640px) 14rem, 20rem' className='object-cover' />
        </div>
      ) : (
        <div
          className='flex size-16 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25 sm:size-20'
        >
          <OfferIcon icon={offer.icon} className='size-8 sm:size-10' />
        </div>
      )}
      <div className='min-w-0 flex-1 space-y-2'>
        {offer.audience && (
          <p className='text-xs font-semibold uppercase tracking-[0.18em] text-primary'>{offer.audience}</p>
        )}
        <h2 className='font-display text-2xl leading-tight tracking-tight text-foreground break-words sm:text-4xl'>
          {offer.title}
        </h2>
        <p className='whitespace-pre-line text-muted-foreground break-words'>{offer.text}</p>
        <div className='flex flex-wrap items-center gap-x-4 gap-y-2 pt-1'>
          {offer.linkUrl && (
            <Button asChild className='rounded-full'>
              <Link href={offer.linkUrl} {...(isExternal && { target: '_blank', rel: 'noopener noreferrer' })}>
                {linkLabel} <ArrowRight />
              </Link>
            </Button>
          )}
          <p className='text-xs text-muted-foreground'>{untilLabel}</p>
        </div>
      </div>
    </article>
  );
};

export default OfferCard;
