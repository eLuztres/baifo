import Link from 'next/link';
import ProductMedia from '@/components/ProductMedia';
import ProductPrice from '@/components/shared/product/product-price';
import RingTileActions from '@/components/admin/category-admin/ring-tile-actions';
import type { CatalogCard } from './catalog-types';

interface CatalogRingCardProps {
  ring: CatalogCard;
  /** The rings of the open category in their order, so the arrows can move this one. */
  ringIds: string[];
  soldOutLabel: string;
  reservedLabel: string;
}

/** A ring in the admin's category view, like in the shop: its photos (the next one on hover), name and price. */
const CatalogRingCard = ({ ring, ringIds, soldOutLabel, reservedLabel }: CatalogRingCardProps) => {
  const badge = ring.isSoldOut ? soldOutLabel : ring.isReserved ? reservedLabel : null;

  return (
    <div className='relative'>
      <Link
        href={`/admin/products/${ring.id}`}
        className='group relative block aspect-[4/5] overflow-hidden rounded-2xl border border-border bg-muted transition hover:border-primary/60'
      >
        <ProductMedia src={ring.images[0]} alt={ring.name} fill sizes='(min-width: 1024px) 16rem, 50vw' className='object-cover' />
        {ring.images[1] && (
          <ProductMedia
            src={ring.images[1]}
            alt=''
            fill
            sizes='(min-width: 1024px) 16rem, 50vw'
            className='object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100'
          />
        )}
        {badge && (
          <span className='absolute left-3 top-3 rounded-full bg-black/70 px-3 py-1 text-xs font-medium text-white backdrop-blur'>
            {badge}
          </span>
        )}
        <div className='absolute inset-x-0 bottom-0 space-y-1 bg-gradient-to-t from-black/85 to-transparent p-3 pt-10 text-white'>
          <p className='truncate font-display text-sm sm:text-base'>{ring.name}</p>
          <div className='flex items-center justify-between gap-2'>
            <ProductPrice value={Number(ring.price)} className='text-sm font-normal' />
            {ring.otherCategories.length > 0 && (
              <span className='truncate text-[0.65rem] uppercase tracking-wider text-white/70'>
                + {ring.otherCategories.join(', ')}
              </span>
            )}
          </div>
        </div>
      </Link>
      <RingTileActions productId={ring.id} name={ring.name} ringIds={ringIds} />
    </div>
  );
};

export default CatalogRingCard;
