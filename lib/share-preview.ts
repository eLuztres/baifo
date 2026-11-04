import sharp from 'sharp';
import { absoluteUrl } from '@/lib/brand';
import { SERVER_URL } from '@/lib/constants';

const PREVIEW_SIZE = 800;
const PREVIEW_QUALITY = 75;

/** A picture made ready for link previews. Photos can be megabytes, too big for WhatsApp, which then shows the site's
    icon instead; a preview also shows largest when it is square. */
export async function sharePreviewResponse(picture?: string | null) {
  if (!picture) return new Response(null, { status: 404 });
  try {
    const photo = await fetch(absoluteUrl(picture, SERVER_URL));
    if (!photo.ok) return new Response(null, { status: 404 });
    const preview = await sharp(await photo.arrayBuffer())
      .rotate()
      .resize(PREVIEW_SIZE, PREVIEW_SIZE, { fit: 'cover', position: sharp.strategy.attention })
      .jpeg({ quality: PREVIEW_QUALITY, mozjpeg: true })
      .toBuffer();
    return new Response(new Uint8Array(preview), {
      headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=86400, s-maxage=604800' },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
