import sharp from 'sharp';
import { prisma } from '@/db/prisma';
import { absoluteUrl } from '@/lib/brand';
import { SERVER_URL } from '@/lib/constants';
import { coverPicture } from '@/lib/video';

const PREVIEW_SIZE = 800;
const PREVIEW_QUALITY = 75;

/** The listing's picture for link previews. Listing photos can be megabytes, too big for WhatsApp, which then shows
    the site's icon instead; a preview also shows largest when it is square. */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await prisma.product.findFirst({ where: { slug }, select: { images: true } });
  const cover = product && coverPicture(product.images);
  if (!cover) return new Response(null, { status: 404 });

  try {
    const photo = await fetch(absoluteUrl(cover, SERVER_URL));
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
