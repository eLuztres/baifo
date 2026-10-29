import Link from 'next/link';
import ProductMedia from '@/components/ProductMedia';
import { cn, formatPriceOrRange, formatPriceTag } from '@/lib/utils';

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
  /** "2 days ago", already in the visitor's language; left out on a new listing, whose badge says it. */
  listedAgo: string;
  /** A big tile in the mosaic: larger text and photo sizes. */
  isLarge?: boolean;
}

/** A tile of the marketplace feed: the whole photo, upright or wide (the next one on hover), badges and age at the top,
    name and price at the bottom. */
export default function FeedCard({ href, name, images, price: rawPrice, priceMax, priceLabel, priceText, badge, note, isReserved, reservedLabel, newLabel, listedAgo, isLarge }: FeedCardProps) {
  // A wanted ad without a budget (or a service without a "from" price) is stored as 0: "Budget 0 €" says nothing.
  const price = priceLabel && !priceMax && Number(rawPrice) === 0 ? undefined : rawPrice;
  const sizes = isLarge ? '(min-width: 1024px) 40vw, 100vw' : '(min-width: 1024px) 20vw, 50vw';
  // Small tiles are ~125px wide on a 320px phone: smaller badges, so "New" and a type badge fit side by side.
  const badgeSize = isLarge ? 'px-2.5 py-1 text-xs' : 'px-1.5 py-0.5 text-[0.7rem] sm:px-2.5 sm:py-1 sm:text-xs';

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
      <div className={cn('@container absolute top-2.5 flex items-start justify-between gap-1', isLarge ? 'inset-x-2.5' : 'inset-x-2 sm:inset-x-2.5')}>
        <div className='flex flex-wrap gap-1 sm:gap-1.5'>
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
        {/* Beside a badge, a 320px phone's tile has no room for the age: left out there rather than cut. */}
        {!newLabel && (
          <span
            className={cn(
              'min-w-0 truncate rounded-full bg-background/60 text-foreground/80 shadow-sm backdrop-blur-sm',
              badgeSize,
              (badge || note || isReserved) && 'hidden @min-[7.5rem]:block'
            )}
          >
            {listedAgo}
          </span>
        )}
      </div>
      {/* The fade is the size container: an element can't query its own width, only its children can. */}
      <div
        className={cn(
          '@container absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent text-white',
          isLarge ? 'p-4 pt-20 sm:p-5 sm:pt-24' : 'p-3 pt-12'
        )}
      >
        {/* The name always ends the tile, with the price centered beside it; a tile too narrow for both (a phone's small
            one) lifts the price above the name instead. */}
        <div
          className={cn(
            'flex',
            isLarge ? 'items-center gap-3' : 'flex-col-reverse gap-1.5 @min-[10rem]:flex-row @min-[10rem]:items-center @min-[10rem]:gap-2'
          )}
        >
          <h2 className={cn('min-w-0 flex-1', isLarge ? 'line-clamp-2 text-balance font-display text-xl leading-snug sm:text-2xl' : 'truncate font-sans text-sm font-medium')}>
            {name}
          </h2>
          {(price || priceText) && (
            // A solid tag in the same spot on every tile, so the eye finds it at once; whole euros ("140 €") read quicker.
            <p
              className={cn(
                'flex max-w-full shrink-0 items-baseline gap-1 rounded-full bg-background/90 font-semibold leading-tight text-foreground tabular-nums shadow-sm',
                isLarge ? 'px-3.5 py-1.5 text-xl' : 'self-end px-2.5 py-1 text-sm @min-[10rem]:self-auto'
              )}
            >
              {/* The label gives way, never the price or a range like "80-150 €", and never the name beside it: left out
                  on a 320px phone's tile and where the price shares a mid-width line with the name (the badge says enough). */}
              {priceLabel && (
                <span className='hidden min-w-0 truncate text-[0.7em] font-normal text-muted-foreground @min-[7.5rem]:inline @min-[10rem]:hidden @min-[14rem]:inline'>
                  {priceLabel}
                </span>
              )}
              <span className='shrink-0 whitespace-nowrap'>{!price ? priceText : priceMax ? formatPriceOrRange(price, priceMax) : formatPriceTag(Number(price))}</span>
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
