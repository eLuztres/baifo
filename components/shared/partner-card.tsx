import Link from 'next/link';
import { ArrowRight, Store } from 'lucide-react';
import ProductMedia from '@/components/ProductMedia';
import { MercadilloIcon } from '@/components/shared/mercadillo-row';
import { cn } from '@/lib/utils';

interface PartnerCardProps {
  href: string;
  name: string;
  text: string;
  icon: string | null;
  /** A few of its listings' pictures, for the cover. */
  pictures: string[];
  /** "Mercadillo": what the card is, on the cover. */
  badge: string;
  /** "7 anuncios", where a listing shows its price. */
  countLabel: string;
  /** The card's width, as for a listing's card. */
  sizes?: string;
}

/** A partner's mercadillo in Explore's grid: one card among the listings, leading to its own page. */
export default function PartnerCard({ href, name, text, icon, pictures, badge, countLabel, sizes = '(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw' }: PartnerCardProps) {
  // Four in a square, two side by side, or one: never an empty quarter.
  const cover = pictures.length >= 4 ? pictures.slice(0, 4) : pictures.slice(0, pictures.length >= 2 ? 2 : 1);
  // Each picture of several fills half the card's width.
  const pictureSizes = cover.length > 1 ? sizes.replace(/(\d+)vw/g, (_, width: string) => `${Math.ceil(Number(width) / 2)}vw`) : sizes;
  return (
    <Link
      href={href}
      className='group flex h-full flex-col overflow-hidden rounded-3xl border border-primary/50 bg-card shadow-lg shadow-primary/10 transition max-sm:rounded-2xl hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/20'
    >
      <div className='relative aspect-[3/4] bg-muted'>
        <div className={cn('grid h-full gap-0.5', cover.length === 4 ? 'grid-cols-2 grid-rows-2' : cover.length === 2 && 'grid-cols-2')}>
          {cover.map((picture) => (
            <div key={picture} className='relative'>
              <ProductMedia src={picture} alt='' fill sizes={pictureSizes} isStill />
            </div>
          ))}
        </div>
        {/* Dark only over the photos (allowed on pictures), so the round sign and the label read on any of them. */}
        <div aria-hidden className='absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/5' />
        <MercadilloIcon src={icon} sizes='7rem' className='absolute left-1/2 top-[44%] size-20 -translate-x-1/2 -translate-y-1/2 border-4 border-card shadow-xl sm:size-28' />
        <span className='absolute bottom-2 left-2 inline-flex max-w-[calc(100%-1rem)] items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground sm:bottom-3 sm:left-3'>
          <Store className='size-3.5 shrink-0' aria-hidden />
          <span className='truncate'>{badge}</span>
        </span>
      </div>
      <div className='flex flex-1 flex-col gap-1 p-3 sm:p-4'>
        <p className='line-clamp-2 font-display text-xl leading-tight sm:text-2xl'>{name}</p>
        {text && <p className='line-clamp-2 text-xs text-muted-foreground sm:text-sm'>{text}</p>}
        <div className='mt-auto flex items-center justify-between gap-2 pt-1'>
          <p className='truncate text-base font-bold text-primary sm:text-xl'>{countLabel}</p>
          {/* The narrowest phones keep the count whole instead. */}
          <ArrowRight className='size-5 shrink-0 text-primary transition group-hover:translate-x-0.5 max-[359px]:hidden' aria-hidden />
        </div>
      </div>
    </Link>
  );
}
