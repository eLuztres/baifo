import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import ProductMedia from '@/components/ProductMedia';
import { cn, formatCurrency } from '@/lib/utils';

export interface RelatedListing {
  href: string;
  name: string;
  image: string;
  /** Missing for services and when the shop shows no prices. */
  price?: string;
  /** Said before the price, e.g. "Budget" on a wanted ad. */
  priceLabel?: string;
}

interface RelatedStripProps {
  title: string;
  listings: RelatedListing[];
  /** The feed, opening with this listing's category. */
  seeAllHref: string;
  seeAllLabel: string;
}

const TILE_CLASS =
  'relative block size-[4.5rem] shrink-0 snap-start overflow-hidden rounded-xl bg-muted sm:size-24 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

/** A slim sideways row under a listing: similar things first, so browsing goes on without going back. */
export default function RelatedStrip({ title, listings, seeAllHref, seeAllLabel }: RelatedStripProps) {
  if (listings.length === 0) return null;

  return (
    <section aria-label={title} className='shrink-0 space-y-2'>
      <h2 className='px-1 text-xs uppercase tracking-[0.2em] text-muted-foreground'>{title}</h2>
      <ul className='-mx-1 flex snap-x gap-2 overflow-x-auto overscroll-x-contain px-1 pb-1 [scrollbar-width:none] sm:gap-3'>
        {listings.map((listing) => (
          <li key={listing.href}>
            <Link href={listing.href} title={listing.name} className={cn('group', TILE_CLASS)}>
              <ProductMedia
                src={listing.image}
                alt={listing.name}
                fill
                sizes='6rem'
                loading='lazy'
                className='object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none'
              />
              {listing.price && (
                <span className='absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-1.5 pb-1 pt-4 text-[0.7rem] font-semibold tabular-nums text-white'>
                  {listing.priceLabel && <span className='mr-1 font-normal text-white/80'>{listing.priceLabel}</span>}
                  {formatCurrency(listing.price)}
                </span>
              )}
            </Link>
          </li>
        ))}
        <li>
          <Link
            href={seeAllHref}
            className={cn(TILE_CLASS, 'flex flex-col items-center justify-center gap-1 border border-primary/30 bg-primary/10 text-center text-xs font-medium text-primary transition-colors hover:bg-primary/15')}
          >
            <ArrowRight className='size-4' aria-hidden='true' />
            {seeAllLabel}
          </Link>
        </li>
      </ul>
    </section>
  );
}
