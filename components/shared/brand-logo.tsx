import Image from 'next/image';
import { cn } from '@/lib/utils';
import { BRAND } from '@/lib/brand';

interface BrandLogoProps {
  className?: string;
  /** Show the shop name next to the logo (also needs BRAND_SHOW_NAME not set to false). */
  withName?: boolean;
  nameClassName?: string;
  priority?: boolean;
}

/** The shop's logo from BRAND_LOGO; works with any size, SVG, or remote URL. */
export default function BrandLogo({ className, withName = false, nameClassName, priority }: BrandLogoProps) {
  return (
    <span className='flex items-center gap-3'>
      {/* unoptimized: the logo may be an SVG or on any host, so it skips the image optimizer */}
      <Image
        src={BRAND.logo}
        alt={withName && BRAND.showNameInHeader ? '' : BRAND.name}
        width={160}
        height={160}
        unoptimized
        priority={priority}
        className={cn('h-10 w-auto', className)}
      />
      {withName && BRAND.showNameInHeader && (
        <span className={cn('font-display text-xl font-semibold tracking-tight', nameClassName)}>{BRAND.name}</span>
      )}
    </span>
  );
}
