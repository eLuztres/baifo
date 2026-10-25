import Link from 'next/link';
import ProductMedia from '@/components/ProductMedia';
import { formatCurrency } from '@/lib/utils';

interface ListingCardProps {
  href: string;
  name: string;
  image: string;
  /** Missing when the shop shows no prices. */
  price?: string;
  isReserved: boolean;
  reservedLabel: string;
  /** How the item is ("Like new"), already in the visitor's language. */
  conditionLabel?: string;
  /** "2 days ago", already in the visitor's language. */
  listedAgo: string;
}

/** A calm grid card: the photo first, then price, name and when it was listed, like the big second-hand apps. */
export default function ListingCard({ href, name, image, price, isReserved, reservedLabel, conditionLabel, listedAgo }: ListingCardProps) {
  return (
    <Link href={href} className='group block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background'>
      <div className='relative aspect-[4/5] overflow-hidden rounded-2xl bg-muted'>
        <ProductMedia
          src={image}
          alt={name}
          fill
          sizes='(min-width: 1280px) 20vw, (min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw'
          className='transition-transform duration-500 ease-out group-hover:scale-[1.03] motion-reduce:transition-none'
        />
        {isReserved && (
          <span className='absolute left-2 top-2 rounded-full bg-background/90 px-2.5 py-1 text-xs font-medium shadow-sm'>{reservedLabel}</span>
        )}
        {conditionLabel && (
          <span className='absolute bottom-2 left-2 rounded-full bg-background/90 px-2.5 py-1 text-xs shadow-sm'>{conditionLabel}</span>
        )}
      </div>
      <div className='space-y-0.5 px-1 pt-2.5'>
        {price && <p className='text-lg font-semibold leading-tight'>{formatCurrency(price)}</p>}
        <h2 className='line-clamp-2 text-sm leading-snug text-foreground/90 group-hover:text-primary'>{name}</h2>
        <p className='text-xs text-muted-foreground'>{listedAgo}</p>
      </div>
    </Link>
  );
}
