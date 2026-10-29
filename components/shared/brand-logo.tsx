import Image from 'next/image';
import { cn } from '@/lib/utils';
import { BRAND } from '@/lib/brand';

interface BrandLogoProps {
  className?: string;
  /** Show the shop name next to the logo (also needs BRAND_SHOW_NAME not set to false). */
  withName?: boolean;
  nameClassName?: string;
  priority?: boolean;
  /** Use the animated logo (BRAND_LOGO_ANIMATED) when there is one and the visitor allows motion. */
  isAnimated?: boolean;
}

// SVGs and logos on other hosts skip the image optimizer; a local PNG/JPG is shrunk to the header's size.
const isOptimizable = (src: string) => src.startsWith('/') && !src.endsWith('.svg');
const LOGOS = [
  { src: BRAND.logo, animatedSrc: BRAND.logoAnimated },
  { src: BRAND.logoDark, animatedSrc: BRAND.logoAnimatedDark },
].filter((logo): logo is { src: string; animatedSrc: string | undefined } => Boolean(logo.src));

/** The shop's logo from BRAND_LOGO; works with any size, SVG, or remote URL. */
export default function BrandLogo({ className, withName = false, nameClassName, priority, isAnimated = false }: BrandLogoProps) {
  return (
    <span className='flex items-center gap-3'>
      {/* Both are in the page and CSS shows the one for the theme, so switching never waits for a download. */}
      {LOGOS.map(({ src, animatedSrc }, index) => {
        const hasAnimation = isAnimated && Boolean(animatedSrc);
        const image = (
          <Image
            key={src}
            src={src}
            alt={withName && BRAND.showNameInHeader ? '' : BRAND.name}
            width={160}
            height={160}
            unoptimized={!isOptimizable(src)}
            // A preload of the still logo would be a wasted download when the animated one shows.
            priority={priority && !hasAnimation}
            className={cn('h-10 w-auto', BRAND.logoDark && (index === 0 ? 'dark:hidden' : 'hidden dark:block'), className)}
          />
        );
        if (!hasAnimation) return image;
        // The browser picks the animated file only when motion is allowed; "reduce motion" keeps the still logo.
        return (
          <picture key={src} className='contents'>
            <source media='(prefers-reduced-motion: no-preference)' srcSet={animatedSrc} />
            {image}
          </picture>
        );
      })}
      {withName && BRAND.showNameInHeader && (
        <span className={cn('font-display text-xl font-semibold tracking-tight', nameClassName)}>{BRAND.name}</span>
      )}
    </span>
  );
}
