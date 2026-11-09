import { prisma } from '@/db/prisma';
import { sharePreviewResponse } from '@/lib/share-preview';

/** What a shared señalador link shows: their photo, small and square enough for WhatsApp. */
export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const scout = await prisma.scout.findUnique({ where: { code: code.toLowerCase() }, select: { image: true } });
  return sharePreviewResponse(scout?.image);
}
