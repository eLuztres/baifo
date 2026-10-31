import Link from 'next/link';
import ProductMedia from '@/components/ProductMedia';
import AiPictureMark from '@/components/shared/product/ai-picture-mark';
import { cn, formatPriceOrRange, formatPriceTag } from '@/lib/utils';

interface FeedCardProps {
  href: string;
  /** The listing's short name: the card has no room for the full title or the description. */
  name: string;
  images: string[];
  /** Missing for services and when the shop shows no prices. */
  price?: string;
  /** The upper end of a price range: shown as a range. */
  priceMax?: string;
  /** Said before the price, e.g. "Up to" on a wanted ad. */
  priceLabel?: string;
  /** Shown where the price would be, e.g. "Free" on a free event. */
  priceText?: string;
  /** One badge on the picture, e.g. the event's date, "Service" or the category. */
  badge?: string;
  /** Set on a picture the AI made: what its small mark beside the price says. */
  aiLabel?: string;
  isReserved: boolean;
  reservedLabel: string;
  /** Set on fresh listings: the "New" label to show. */
  newLabel?: string;
  /** "2 days ago · Corralejo", already in the visitor's language; may be empty. */
  listedAgo: string;
}

/** A marketplace card like the admin's listing cards: the photo on top (the next one on hover), and below it the short
    name, the price and when and where it was listed. */
export default function FeedCard({ href, name, images, price: rawPrice, priceMax, priceLabel, priceText, badge, aiLabel, isReserved, reservedLabel, newLabel, listedAgo }: FeedCardProps) {
  // A wanted ad without a budget or a service without a price is stored as 0: "0 €" says nothing.
  const price = (priceLabel || badge) && !priceMax && Number(rawPrice) === 0 ? undefined : rawPrice;
  const sizes = '(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw';
  const priceTag = price ? (priceMax ? formatPriceOrRange(price, priceMax) : formatPriceTag(Number(price))) : priceText;

  return (
    <Link
      href={href}
      className='group block h-full overflow-hidden rounded-3xl border border-border bg-card transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background motion-reduce:transition-none'
    >
      <div className='relative aspect-[3/4] bg-muted'>
        {/* The photo fills its frame, like the admin's listing cards. */}
        <ProductMedia src={images[0]} alt={name} fill sizes={sizes} playsWhenVisible />
        {images[1] && (
          <div className='absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100'>
            <ProductMedia src={images[1]} alt='' fill sizes={sizes} isStill />
          </div>
        )}
        {(newLabel || badge || isReserved) && (
          // Small badges, so two still fit side by side on a 320px phone's card.
          <div className='absolute inset-x-2 top-2 flex flex-wrap gap-1 sm:inset-x-3 sm:top-3 sm:gap-1.5'>
            {newLabel && (
              <span className='inline-flex items-center gap-1.5 rounded-full bg-background/90 px-2 py-0.5 text-[0.7rem] font-medium shadow-sm sm:text-xs'>
                <span aria-hidden='true' className='size-1.5 animate-pulse rounded-full bg-primary motion-reduce:animate-none' />
                {newLabel}
              </span>
            )}
            {badge && (
              <span className='max-w-full truncate rounded-full bg-primary px-2 py-0.5 text-[0.7rem] font-medium text-primary-foreground shadow-sm sm:text-xs'>{badge}</span>
            )}
            {isReserved && <span className='rounded-full bg-background/90 px-2 py-0.5 text-[0.7rem] font-medium shadow-sm sm:text-xs'>{reservedLabel}</span>}
          </div>
        )}
      </div>
      <div className='space-y-1 p-3 sm:p-4'>
        <h2 className='truncate font-sans font-medium'>{name}</h2>
        {(priceTag || aiLabel) && (
          <div className='flex min-w-0 items-center gap-1.5'>
            {priceTag && (
              <p className='flex min-w-0 items-baseline gap-1 font-semibold text-primary tabular-nums'>
                {priceLabel && <span className='min-w-0 truncate text-sm font-normal text-muted-foreground'>{priceLabel}</span>}
                <span className='shrink-0 whitespace-nowrap'>{priceTag}</span>
              </p>
            )}
            {aiLabel && <AiPictureMark label={aiLabel} />}
          </div>
        )}
        {listedAgo && <p className='truncate text-xs text-muted-foreground'>{listedAgo}</p>}
      </div>
    </Link>
  );
}
