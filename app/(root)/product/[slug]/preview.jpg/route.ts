import { prisma } from '@/db/prisma';
import { isLocale } from '@/lib/i18n-core';
import { getPictureFallbackLocales } from '@/lib/i18n-server';
import { localizePictures } from '@/lib/marketplace/pictures';
import { parsePhoto, photoName } from '@/lib/print';
import { sharePreviewResponse } from '@/lib/share-preview';
import { coverPicture, pictureOf } from '@/lib/video';

/** The listing's picture for link previews: `?foto=` the one shared, else its cover; `?lang=` among that language's pictures. */
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const query = new URL(request.url).searchParams;
  const foto = query.get('foto') ?? undefined;
  const lang = query.get('lang');
  const product = await prisma.product.findFirst({ where: { slug }, select: { images: true, pictureLanguages: true } });
  if (!product) return sharePreviewResponse(null);
  const images = isLocale(lang) ? localizePictures(product.images, product.pictureLanguages, lang, getPictureFallbackLocales()) : product.images;
  // The file name (`v`) names the picture the person chose, whatever its place among this language's.
  const named = product.images.find((url) => photoName(url) === query.get('v'));
  const chosen = foto && pictureOf(named ?? images[parsePhoto(foto, images.length)]);
  return sharePreviewResponse(chosen || coverPicture(images));
}
