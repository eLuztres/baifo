import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { OfferItem } from '@/lib/offers-core';
import { cn } from '@/lib/utils';
import OfferIcon from './offer-icon';

export type { OfferItem };

interface OfferCardProps extends OfferItem {
  linkLabel: string;
  /** `compact` fits the home announcement on a phone; `full` is the offers page. */
  size?: 'compact' | 'full';
  className?: string;
}

/** One offer, big and lit: its icon, who it's for, the title, the text, until when it runs and its button. */
const OfferCard = ({ offer, untilLabel, linkLabel, size = 'full', className }: OfferCardProps) => {
  const isCompact = size === 'compact';
  const isExternal = offer.linkUrl?.startsWith('https://');
  return (
    <article className={cn('flex gap-4 sm:gap-6', isCompact ? 'flex-row items-start' : 'flex-col sm:flex-row sm:items-start', className)}>
      <div
        className={cn(
          'flex shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25',
          isCompact ? 'size-12 sm:size-16' : 'size-16 sm:size-20'
        )}
      >
        <OfferIcon icon={offer.icon} className={isCompact ? 'size-6 sm:size-8' : 'size-8 sm:size-10'} />
      </div>
      <div className='min-w-0 flex-1 space-y-2'>
        {offer.audience && (
          <p className='text-xs font-semibold uppercase tracking-[0.18em] text-primary'>{offer.audience}</p>
        )}
        <h2 className={cn('font-display leading-tight tracking-tight text-foreground break-words', isCompact ? 'text-lg sm:text-3xl' : 'text-2xl sm:text-4xl')}>
          {offer.title}
        </h2>
        <p className={cn('whitespace-pre-line text-muted-foreground break-words', isCompact && 'line-clamp-2 text-sm sm:line-clamp-3 sm:text-base')}>{offer.text}</p>
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
