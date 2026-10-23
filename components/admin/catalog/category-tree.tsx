import Link from 'next/link';
import { ChevronRight, CircleOff } from 'lucide-react';
import ProductMedia from '@/components/ProductMedia';
import { cn } from '@/lib/utils';
import type { CatalogBranch, CatalogCard } from './catalog-types';

type TreeRing = Pick<CatalogCard, 'id' | 'name' | 'isSoldOut'> & {
  /** Shown as small previews under the name (the shop's tree). */
  images?: string[];
};

export interface TreeBranch extends Pick<CatalogBranch, 'slug' | 'name' | 'image'> {
  rings: TreeRing[];
}

interface CategoryTreeProps {
  branches: TreeBranch[];
  selectedSlug: string;
  label: string;
  /** Where a category name leads; null leaves it plain text that only opens the branch (the shop's tree). */
  categoryHref?: ((slug: string) => string) | null;
  ringHref?: (ring: TreeRing, branch: TreeBranch) => string;
  isOpenByDefault?: boolean;
}

const adminCategoryHref = (slug: string) => `/admin/products?c=${slug}`;
const adminRingHref = (ring: TreeRing) => `/admin/products/${ring.id}`;

/** The categories as a tree: each one opens to the rings it holds; a click on a name shows that category. */
const CategoryTree = ({
  branches,
  selectedSlug,
  label,
  categoryHref = adminCategoryHref,
  ringHref = adminRingHref,
  isOpenByDefault = false,
}: CategoryTreeProps) => (
  <nav aria-label={label} className='space-y-1'>
    {branches.map((branch) => {
      const isSelected = branch.slug === selectedSlug;
      const nameClass = cn('min-w-0 flex-1 truncate text-sm', isSelected ? 'font-semibold text-primary' : 'text-foreground');
      return (
        <details key={branch.slug} open={isOpenByDefault || isSelected} className='group rounded-xl'>
          <summary
            className={cn(
              'flex cursor-pointer list-none items-center gap-2 rounded-xl px-2 py-1.5 transition hover:bg-muted [&::-webkit-details-marker]:hidden',
              isSelected && 'bg-muted'
            )}
          >
            <ChevronRight className='size-4 shrink-0 text-muted-foreground transition group-open:rotate-90' />
            <span className='relative size-8 shrink-0 overflow-hidden rounded-md bg-muted'>
              {branch.image ? (
                <ProductMedia src={branch.image} alt='' fill sizes='2rem' className='object-cover' />
              ) : (
                <CircleOff className='m-2 size-4 text-muted-foreground' />
              )}
            </span>
            {categoryHref ? (
              <Link href={categoryHref(branch.slug)} className={nameClass}>
                {branch.name}
              </Link>
            ) : (
              <span className={nameClass}>{branch.name}</span>
            )}
            <span className='text-xs tabular-nums text-muted-foreground'>{branch.rings.length}</span>
          </summary>
          <ul className='ml-6 space-y-0.5 border-l border-border py-1 pl-3'>
            {branch.rings.map((ring) => (
              <li key={ring.id}>
                <Link
                  href={ringHref(ring, branch)}
                  className={cn(
                    'block truncate rounded-md px-2 py-0.5 text-xs transition hover:bg-muted hover:text-foreground',
                    ring.isSoldOut ? 'text-muted-foreground/60 line-through' : 'text-muted-foreground'
                  )}
                >
                  {ring.name}
                  {ring.images && ring.images.length > 0 && (
                    <span className='mt-1 flex gap-1.5'>
                      {ring.images.map((image) => (
                        <span key={image} className='relative size-16 shrink-0 overflow-hidden rounded-lg bg-muted sm:size-20'>
                          <ProductMedia src={image} alt='' fill sizes='5rem' className='object-cover' />
                        </span>
                      ))}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </details>
      );
    })}
  </nav>
);

export default CategoryTree;
