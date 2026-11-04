import { prisma } from '@/db/prisma';
import { sharePreviewResponse } from '@/lib/share-preview';
import { coverPicture } from '@/lib/video';

/** The listing's picture for link previews. */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await prisma.product.findFirst({ where: { slug }, select: { images: true } });
  return sharePreviewResponse(product && coverPicture(product.images));
}
