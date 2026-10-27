import Link from 'next/link';
import ProductMedia from '@/components/ProductMedia';
import { cn, formatPriceOrRange } from '@/lib/utils';

interface FeedCardProps {
  href: string;
  name: string;
  images: string[];
  /** Missing for services and when the shop shows no prices. */
  price?: string;
  /** The upper end of a wanted ad's budget: shown as a range. */
  priceMax?: string;
  /** Said before the price, e.g. "Budget" on a wanted ad. */
  priceLabel?: string;
  /** Shown where the price would be, e.g. "Free" on a free event. */
  priceText?: string;
  /** Shown instead of a price, e.g. "Service". */
  badge?: string;
  /** A quiet note on the picture, e.g. that the AI made it. */
  note?: string;
  isReserved: boolean;
  reservedLabel: string;
  /** Set on fresh listings: the "New" label to show. */
  newLabel?: string;
  /** "2 days ago", already in the visitor's language. */
  listedAgo: string;
  /** A big tile in the mosaic: larger text and photo sizes. */
  isLarge?: boolean;
}

/** A tile of the marketplace feed: the whole photo, upright or wide (the next one on hover), name and price over a dark fade. */
export default function FeedCard({ href, name, images, price, priceMax, priceLabel, priceText, badge, note, isReserved, reservedLabel, newLabel, listedAgo, isLarge }: FeedCardProps) {
  const sizes = isLarge ? '(min-width: 1024px) 40vw, 100vw' : '(min-width: 1024px) 20vw, 50vw';
  // Small tiles are ~125px wide on a 320px phone: smaller badges, so two of them don't run into the price.
  const badgeSize = isLarge ? 'px-2.5 py-1 text-xs' : 'px-2 py-0.5 text-[0.7rem] sm:px-2.5 sm:py-1 sm:text-xs';

  return (
    <Link
      href={href}
      className='group relative block h-full overflow-hidden rounded-2xl bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background'
    >
      <ProductMedia
        src={images[0]}
        alt={name}
        fill
        sizes={sizes}
        playsWhenVisible
        isWhole
        className='transition-transform duration-700 ease-out group-hover:scale-[1.04] motion-reduce:transition-none'
      />
      {/* The fade sits on a wrapper: a whole picture's blurred backdrop must fade with it. */}
      {images[1] && (
        <div className='absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100'>
          <ProductMedia src={images[1]} alt='' fill sizes={sizes} isStill isWhole />
        </div>
      )}
      <div className='absolute left-2.5 top-2.5 flex flex-wrap gap-1.5'>
        {newLabel && (
          <span className={cn('inline-flex items-center gap-1.5 rounded-full bg-background/90 font-medium shadow-sm', badgeSize)}>
            <span aria-hidden='true' className='size-1.5 animate-pulse rounded-full bg-primary motion-reduce:animate-none' />
            {newLabel}
          </span>
        )}
        {badge && <span className={cn('rounded-full bg-primary font-medium text-primary-foreground shadow-sm', badgeSize)}>{badge}</span>}
        {note && <span className={cn('rounded-full bg-background/90 shadow-sm', badgeSize)}>{note}</span>}
        {isReserved && <span className={cn('rounded-full bg-background/90 font-medium shadow-sm', badgeSize)}>{reservedLabel}</span>}
      </div>
      <div className={cn('absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent text-white', isLarge ? 'p-4 pt-20 sm:p-5 sm:pt-24' : 'p-3 pt-10')}>
        {(price || priceText) && (
          <p className={cn('font-semibold leading-tight tabular-nums', isLarge ? 'text-2xl' : 'text-base')}>
            {/* On a small tile the label gets its own line, so a range like "80-150 €" isn't split or cut off. */}
            {priceLabel && <span className={cn('text-[0.65em] font-normal text-white/80', isLarge ? 'mr-1' : 'block')}>{priceLabel}</span>}
            <span className='whitespace-nowrap'>{price ? formatPriceOrRange(price, priceMax) : priceText}</span>
          </p>
        )}
        <h2 className={cn('line-clamp-2 text-balance leading-snug', isLarge ? 'font-display text-xl sm:text-2xl' : 'text-sm')}>{name}</h2>
        <p className='mt-0.5 text-[0.7rem] text-white/70'>{listedAgo}</p>
      </div>
    </Link>
  );
}
