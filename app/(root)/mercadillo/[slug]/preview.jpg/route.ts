import { prisma } from '@/db/prisma';
import { getInStockRings } from '@/components/shared/home/in-stock-rings';
import { sharePreviewResponse } from '@/lib/share-preview';

/** What a shared Mercadillo shows: its icon, else its picture, else its first listing's. */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const mercadillo = await prisma.mercadillo.findUnique({ where: { slug }, select: { id: true, image: true, icon: true } });
  if (!mercadillo) return new Response(null, { status: 404 });
  const picture = mercadillo.icon ?? mercadillo.image ?? (await getInStockRings({ mercadilloId: mercadillo.id }))[0]?.image;
  return sharePreviewResponse(picture);
}
