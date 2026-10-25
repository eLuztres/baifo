import type { HTMLAttributes } from 'react';
import ProductMedia from '@/components/ProductMedia';
import { cn } from '@/lib/utils';

interface ListingStageProps extends HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt?: string;
}

/** The big picture every listing screen is built around; overlays go in as children. */
export default function ListingStage({ src, alt = '', className, children, ...props }: ListingStageProps) {
  return (
    <div
      className={cn('relative aspect-[4/5] w-full overflow-hidden rounded-[2rem] border border-border bg-muted shadow-2xl shadow-primary/10', className)}
      {...props}
    >
      {/* The key remounts the picture, so the AI version fades in over the original. */}
      {src && (
        <ProductMedia
          key={src}
          src={src}
          alt={alt}
          fill
          priority
          sizes='(min-width: 640px) 36rem, 100vw'
          className='transition-opacity duration-700 starting:opacity-0 motion-reduce:transition-none'
        />
      )}
      {children}
    </div>
  );
}
