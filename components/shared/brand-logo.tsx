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

// SVGs and logos on other hosts skip the image optimizer; a local PNG/JPG is shrunk to the header's size.
const isOptimizable = (src: string) => src.startsWith('/') && !src.endsWith('.svg');
const LOGOS = [BRAND.logo, BRAND.logoDark].filter((src): src is string => Boolean(src));

/** The shop's logo from BRAND_LOGO; works with any size, SVG, or remote URL. */
export default function BrandLogo({ className, withName = false, nameClassName, priority }: BrandLogoProps) {
  return (
    <span className='flex items-center gap-3'>
      {/* Both are in the page and CSS shows the one for the theme, so switching never waits for a download. */}
      {LOGOS.map((src, index) => (
        <Image
          key={src}
          src={src}
          alt={withName && BRAND.showNameInHeader ? '' : BRAND.name}
          width={160}
          height={160}
          unoptimized={!isOptimizable(src)}
          priority={priority}
          className={cn('h-10 w-auto', BRAND.logoDark && (index === 0 ? 'dark:hidden' : 'hidden dark:block'), className)}
        />
      ))}
      {withName && BRAND.showNameInHeader && (
        <span className={cn('font-display text-xl font-semibold tracking-tight', nameClassName)}>{BRAND.name}</span>
      )}
    </span>
  );
}
