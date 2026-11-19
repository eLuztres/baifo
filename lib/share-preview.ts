import sharp from 'sharp';
import { absoluteUrl } from '@/lib/brand';
import { SERVER_URL } from '@/lib/constants';
import { photoName } from '@/lib/print';

/** A listing's link preview picture: its cover, or `picture` from its gallery. That one's file name in the address,
    so a reordered or new photo isn't hidden behind the cached old one. `lang`: the gallery is that language's pictures. */
export function listingPreviewPath(slug: string, images: string[], picture = 0, lang?: string) {
  const params = new URLSearchParams(picture > 0 ? { foto: String(picture), v: photoName(images[picture]) } : {});
  if (lang) params.set('lang', lang);
  const query = params.toString();
  return `/product/${slug}/preview.jpg${query ? `?${query}` : ''}`;
}

const PREVIEW_SIZE = 800;
const PREVIEW_QUALITY = 75;
const BADGE_MARGIN = 32;

/** A picture made ready for link previews. Photos can be megabytes, too big for WhatsApp, which then shows the site's
    icon instead; a preview also shows largest when it is square. `badge`: an SVG laid on its top left corner. */
export async function sharePreviewResponse(picture?: string | null, badge?: string) {
  if (!picture) return new Response(null, { status: 404 });
  try {
    const photo = await fetch(absoluteUrl(picture, SERVER_URL));
    if (!photo.ok) return new Response(null, { status: 404 });
    const preview = await sharp(await photo.arrayBuffer())
      .rotate()
      .resize(PREVIEW_SIZE, PREVIEW_SIZE, { fit: 'cover', position: sharp.strategy.attention })
      .composite(badge ? [{ input: Buffer.from(badge), top: BADGE_MARGIN, left: BADGE_MARGIN }] : [])
      .jpeg({ quality: PREVIEW_QUALITY, mozjpeg: true })
      .toBuffer();
    return new Response(new Uint8Array(preview), {
      headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=86400, s-maxage=604800' },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
