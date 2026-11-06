import { prisma } from '@/db/prisma';
import { isAdmin } from '@/lib/auth-guard';
import { toProductTranslations } from './catalog';
import { isAdminPreviewSlug, previewSubmissionId } from './preview-slug';

/** The product page's row for /product/vista-<id>: a listing not online, shaped like its product. Only for an admin. */
export async function getAdminProductPreview(slug: string) {
  const id = previewSubmissionId(slug);
  if (!isAdminPreviewSlug(slug) || !(await isAdmin())) return null;
  const submission = await prisma.submission.findUnique({ where: { id }, include: { seller: { select: { waId: true, name: true } }, tags: { select: { id: true, names: true } }, mercadillo: { select: { slug: true, name: true, icon: true } } } });
  if (!submission?.title) return null;
  const { title, shortTitle, description, images, rawImages, price, priceMode, type, condition, serviceType, startsAt, address, placeId } = submission;
  return {
    id,
    slug,
    name: title,
    shortName: shortTitle,
    description: description ?? '',
    translations: toProductTranslations(submission.translations),
    category: submission.categories[0] ?? '',
    images: images.length > 0 ? images : rawImages,
    price: price?.toString() ?? '0',
    priceMode: priceMode ?? 'NONE',
    type,
    condition,
    serviceType,
    startsAt,
    address,
    placeId,
    mercadillo: submission.mercadillo,
    stock: 1,
    reservedUntil: null,
    reservedById: null,
    contactPhone: null,
    expiresAt: submission.expiresAt,
    createdAt: submission.createdAt,
    submission: { id, sellerName: submission.sellerName, sellerLocale: submission.sellerLocale, contactEmail: submission.contactEmail, contactWeb: submission.contactWeb, contactInstagram: submission.contactInstagram, seller: submission.seller, tags: submission.tags },
  };
}
