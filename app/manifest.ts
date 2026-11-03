import type { MetadataRoute } from 'next';
import { BRAND } from '@/lib/brand';

/** What a phone uses when the site is added to its home screen: it opens like an app, without the browser's bar. */
export default function manifest(): MetadataRoute.Manifest {
  const background = BRAND.theme === 'dark' ? BRAND.darkColors.background : BRAND.colors.background;
  return {
    name: BRAND.name,
    short_name: BRAND.name,
    start_url: '/',
    display: 'standalone',
    background_color: background,
    theme_color: background,
    icons: [
      { src: BRAND.appIcon, sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: BRAND.appIconMaskable, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
