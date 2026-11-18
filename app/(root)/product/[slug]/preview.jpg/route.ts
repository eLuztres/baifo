import { prisma } from '@/db/prisma';
import { parsePhoto } from '@/lib/print';
import { sharePreviewResponse } from '@/lib/share-preview';
import { coverPicture, pictureOf } from '@/lib/video';

/** The listing's picture for link previews: `?foto=` the one shared, else its cover. */
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const foto = new URL(request.url).searchParams.get('foto') ?? undefined;
  const product = await prisma.product.findFirst({ where: { slug }, select: { images: true } });
  if (!product) return sharePreviewResponse(null);
  const chosen = foto && pictureOf(product.images[parsePhoto(foto, product.images.length)]);
  return sharePreviewResponse(chosen || coverPicture(product.images));
}
