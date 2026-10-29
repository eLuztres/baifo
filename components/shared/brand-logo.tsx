import Image from 'next/image';
import { cn } from '@/lib/utils';
import { BRAND } from '@/lib/brand';

interface BrandLogoProps {
  className?: string;
  /** Show the shop name next to the logo (also needs BRAND_SHOW_NAME not set to false). */
  withName?: boolean;
  nameClassName?: string;
  priority?: boolean;
  /** Show the animated mark and the wordmark (BRAND_LOGO_ANIMATED, BRAND_LOGO_WORDMARK) instead, when there is one. */
  isAnimated?: boolean;
}

interface ThemedImageProps {
  src: string;
  darkSrc?: string;
  alt: string;
  className?: string;
  priority?: boolean;
}

// SVGs and logos on other hosts skip the image optimizer; a local PNG/JPG is shrunk to the header's size.
const isOptimizable = (src: string) => src.startsWith('/') && !src.endsWith('.svg');

/** One image per theme; both are in the page and CSS shows the one for the theme, so switching never waits for a download. */
function ThemedImage({ src, darkSrc, alt, className, priority }: ThemedImageProps) {
  return [src, darkSrc]
    .filter((imageSrc): imageSrc is string => Boolean(imageSrc))
    .map((imageSrc, index) => (
      <Image
        key={imageSrc}
        src={imageSrc}
        alt={alt}
        width={160}
        height={160}
        unoptimized={!isOptimizable(imageSrc)}
        priority={priority}
        className={cn('h-10 w-auto', darkSrc && (index === 0 ? 'dark:hidden' : 'hidden dark:block'), className)}
      />
    ));
}

/** The animated mark in its own corner, the still wordmark beside it. */
function AnimatedBrandLogo({ markSrc, priority }: { markSrc: string; priority?: boolean }) {
  return (
    <span className='flex items-center gap-3 sm:gap-4'>
      {/* Fixed boxes: whatever the files' own sizes, the header keeps its height. */}
      <span className='flex h-[calc(var(--logo-height)*0.75)] max-w-[calc(var(--logo-height)*1.2)] shrink-0 overflow-hidden sm:h-(--logo-height)'>
        {[markSrc, BRAND.logoAnimatedDark].filter((src): src is string => Boolean(src)).map((src, index) => (
          // Images don't get "reduce motion" inside SVGs everywhere: then the browser takes "#still", which the SVG shows unanimated.
          <picture key={src} className={cn('h-full', BRAND.logoAnimatedDark && (index === 0 ? 'dark:hidden' : 'hidden dark:block'))}>
            <source media='(prefers-reduced-motion: no-preference)' srcSet={src} />
            {/* eslint-disable-next-line @next/next/no-img-element -- a plain img so <source> can swap it; SVGs skip the optimizer anyway */}
            <img src={`${src}#still`} alt='' width={160} height={160} fetchPriority={priority ? 'high' : undefined} className='h-full w-auto object-contain' />
          </picture>
        ))}
      </span>
      {BRAND.logoWordmark ? (
        <span className='flex h-[calc(var(--logo-height)*0.4)] max-w-[40vw] overflow-hidden sm:h-[calc(var(--logo-height)*0.52)]'>
          <ThemedImage src={BRAND.logoWordmark} darkSrc={BRAND.logoWordmarkDark} alt={BRAND.name} priority={priority} className='h-full w-auto object-contain' />
        </span>
      ) : (
        <span className='font-display text-2xl font-semibold tracking-tight sm:text-3xl'>{BRAND.name}</span>
      )}
    </span>
  );
}

/** The shop's logo from BRAND_LOGO; works with any size, SVG, or remote URL. */
export default function BrandLogo({ className, withName = false, nameClassName, priority, isAnimated = false }: BrandLogoProps) {
  if (isAnimated && BRAND.logoAnimated) return <AnimatedBrandLogo markSrc={BRAND.logoAnimated} priority={priority} />;
  return (
    <span className='flex items-center gap-3'>
      <ThemedImage
        src={BRAND.logo}
        darkSrc={BRAND.logoDark}
        alt={withName && BRAND.showNameInHeader ? '' : BRAND.name}
        priority={priority}
        className={className}
      />
      {withName && BRAND.showNameInHeader && (
        <span className={cn('font-display text-xl font-semibold tracking-tight', nameClassName)}>{BRAND.name}</span>
      )}
    </span>
  );
}
