import Link from 'next/link';
import ProductMedia from '@/components/ProductMedia';
import { cn, formatCurrency } from '@/lib/utils';

interface FeedCardProps {
  href: string;
  name: string;
  images: string[];
  /** Missing for services and when the shop shows no prices. */
  price?: string;
  /** Shown instead of a price, e.g. "Service". */
  badge?: string;
  isReserved: boolean;
  reservedLabel: string;
  /** "2 days ago", already in the visitor's language. */
  listedAgo: string;
  /** A big tile in the mosaic: larger text and photo sizes. */
  isLarge?: boolean;
}

/** A tile of the marketplace feed: the photo fills it (the next one on hover), name and price over a dark fade. */
export default function FeedCard({ href, name, images, price, badge, isReserved, reservedLabel, listedAgo, isLarge }: FeedCardProps) {
  const sizes = isLarge ? '(min-width: 1024px) 40vw, 100vw' : '(min-width: 1024px) 20vw, 50vw';

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
        className='object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04] motion-reduce:transition-none'
      />
      {images[1] && (
        <ProductMedia
          src={images[1]}
          alt=''
          fill
          sizes={sizes}
          className='object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100'
        />
      )}
      <div className='absolute left-2.5 top-2.5 flex flex-wrap gap-1.5'>
        {badge && <span className='rounded-full bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground shadow-sm'>{badge}</span>}
        {isReserved && <span className='rounded-full bg-background/90 px-2.5 py-1 text-xs font-medium shadow-sm'>{reservedLabel}</span>}
      </div>
      <div className={cn('absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent text-white', isLarge ? 'p-4 pt-20 sm:p-5 sm:pt-24' : 'p-3 pt-12')}>
        {price && <p className={cn('font-semibold leading-tight', isLarge ? 'text-2xl' : 'text-base')}>{formatCurrency(price)}</p>}
        <h2 className={cn('line-clamp-2 leading-snug', isLarge ? 'font-display text-xl sm:text-2xl' : 'text-sm')}>{name}</h2>
        <p className='mt-0.5 text-[0.7rem] text-white/70'>{listedAgo}</p>
      </div>
    </Link>
  );
}
