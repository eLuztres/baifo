import { cn } from '@/lib/utils';

interface BrandStampProps {
  /** The mark's picture (BRAND.stamp); nothing shows without it. */
  src?: string;
  className?: string;
}

/** The shop's small mark in a product picture's bottom-right corner, the same size however big the picture shows.
    The parent must be positioned. */
export default function BrandStamp({ src, className }: BrandStampProps) {
  if (!src) return null;
  const mask = `url(${src}) center / contain no-repeat`;
  // The shadow sits on a wrapper: a mask would cut it off.
  return (
    <span aria-hidden='true' className={cn('pointer-events-none absolute bottom-2.5 right-2.5 drop-shadow-[0_1px_2px_rgb(0_0_0/0.5)]', className)}>
      <span className='block size-4.5 bg-white/90' style={{ mask, WebkitMask: mask }} />
    </span>
  );
}
