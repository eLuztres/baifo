/** @jest-environment jsdom */
import type { ComponentType } from 'react';
import { render } from '@testing-library/react';

interface BrandLogoProps {
  isAnimated?: boolean;
}

// A plain <img>: the isolated module registry below would otherwise load a second React for next/image.
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

const LOGO_ENV = {
  BRAND_LOGO: '/brand/logo.png',
  BRAND_LOGO_DARK: '/brand/logo-dark.png',
  BRAND_LOGO_ANIMATED: '/brand/logo-alive.svg',
  BRAND_LOGO_ANIMATED_DARK: '/brand/logo-alive-dark.svg',
};

// BRAND reads the env when the module loads, so each test loads the logo fresh.
async function loadBrandLogo(env: Partial<typeof LOGO_ENV>): Promise<ComponentType<BrandLogoProps>> {
  for (const key of Object.keys(LOGO_ENV)) delete process.env[key];
  for (const [key, value] of Object.entries(env)) if (value) process.env[key] = value;
  let BrandLogo!: ComponentType<BrandLogoProps>;
  await jest.isolateModulesAsync(async () => {
    BrandLogo = (await import('@/components/shared/brand-logo')).default;
  });
  return BrandLogo;
}

const sourcesOf = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('picture source')).map((source) => ({
    srcSet: source.getAttribute('srcset'),
    media: source.getAttribute('media'),
  }));

describe('BrandLogo', () => {
  it('offers the animated logos only to visitors who allow motion', async () => {
    const BrandLogo = await loadBrandLogo(LOGO_ENV);
    const { container } = render(<BrandLogo isAnimated />);

    expect(sourcesOf(container)).toEqual([
      { srcSet: '/brand/logo-alive.svg', media: '(prefers-reduced-motion: no-preference)' },
      { srcSet: '/brand/logo-alive-dark.svg', media: '(prefers-reduced-motion: no-preference)' },
    ]);
    // The still logos stay as the fallback for "reduce motion".
    expect(container.querySelectorAll('picture img')).toHaveLength(2);
  });

  it('keeps the still logos where the animation is not asked for', async () => {
    const BrandLogo = await loadBrandLogo(LOGO_ENV);
    const { container } = render(<BrandLogo />);

    expect(container.querySelector('picture')).toBeNull();
    expect(container.querySelectorAll('img')).toHaveLength(2);
  });

  it('stays still when no animated logo is configured', async () => {
    const BrandLogo = await loadBrandLogo({ BRAND_LOGO: LOGO_ENV.BRAND_LOGO, BRAND_LOGO_DARK: LOGO_ENV.BRAND_LOGO_DARK });
    const { container } = render(<BrandLogo isAnimated />);

    expect(container.querySelector('picture')).toBeNull();
    expect(container.querySelectorAll('img')).toHaveLength(2);
  });

  it('animates only the light logo when there is no dark animated one', async () => {
    const BrandLogo = await loadBrandLogo({ ...LOGO_ENV, BRAND_LOGO_ANIMATED_DARK: undefined });
    const { container } = render(<BrandLogo isAnimated />);

    expect(sourcesOf(container).map((source) => source.srcSet)).toEqual(['/brand/logo-alive.svg']);
    expect(container.querySelectorAll('img')).toHaveLength(2);
  });
});
