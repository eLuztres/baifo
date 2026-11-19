import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { CalendarDays, MapPin } from 'lucide-react';
import { prisma } from '@/db/prisma';
import WhatsAppQr from '@/components/shared/whatsapp-qr';
import { getProductBySlug } from '@/lib/product';
import { BRAND, EMAIL_COLORS } from '@/lib/brand';
import { conditionKey, CONTACT_LIMIT, SERVER_URL, SHOWS_PRICES } from '@/lib/constants';
import { formatEventDate } from '@/lib/event-date';
import { withLang } from '@/lib/i18n-core';
import { getOwnLocale, getPictureFallbackLocales, getT } from '@/lib/i18n-server';
import { localizePictures } from '@/lib/marketplace/pictures';
import { priceLabelKey, serviceTypeKey } from '@/lib/listing-labels';
import { localize, localizeProduct } from '@/lib/localize';
import { sellerIdentity } from '@/lib/marketplace/seller';
import { isRateLimited } from '@/lib/rate-limit';
import { clientIp } from '@/lib/sign-in-limit';
import { cn, formatPriceTag } from '@/lib/utils';
import { parseCopies, photoPosition, printableMedia, printDescription, printParagraphs, printPhotos } from '@/lib/print';
import { PrintToolbar } from './print-controls';
import PrintSheets from './print-sheet';
import styles from './print-sheet.module.css';

interface PrintPageProps {
  params: Promise<{ slug: string }>;
  /** `copias` 1, 2 or 4 per sheet, `foto` which photo; `imprimir=1` (from the print choice) opens the print right away, see print-sheet.tsx. */
  searchParams: Promise<{ copias?: string; foto?: string }>;
}

export async function generateMetadata({ params }: PrintPageProps): Promise<Metadata> {
  const { slug } = await params;
  const [product, { locale }] = await Promise.all([getProductBySlug(slug), getT()]);
  // The title is the PDF's file name.
  return { title: product ? localizeProduct(product, locale).name : undefined, robots: { index: false, follow: false } };
}

/** The seller's number, under the same per-IP limit as "Contact seller", so this page can't be used to collect numbers. */
async function sellerPhone(productId: string) {
  if (await isRateLimited(CONTACT_LIMIT, clientIp(await headers()))) return null;
  const product = await prisma.product.findFirst({
    where: { id: productId, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
    select: { contactPhone: true },
  });
  return product?.contactPhone ?? null;
}

/** A listing lying across an A4 page, or 2 or 4 copies of it, with one of its photos, to print or save as a PDF. */
export default async function PrintListingPage({ params, searchParams }: PrintPageProps) {
  const [{ slug }, { copias, foto }] = await Promise.all([params, searchParams]);
  const [product, { t, locale }] = await Promise.all([getProductBySlug(slug), getT()]);
  if (!product) notFound();

  const copies = parseCopies(copias);
  const { name, description } = localizeProduct(product, locale);
  // The pictures the listing showed this visitor, so `?foto=` is the one they chose.
  const pictures = localizePictures(product.images, product.pictureLanguages, locale, getPictureFallbackLocales());
  const photos = printPhotos(pictures);
  const phone = product.contactPhone ? await sellerPhone(product.id) : BRAND.contact.phone;
  const seller = product.submission && sellerIdentity(product.submission);
  const listingUrl = `${SERVER_URL}${withLang(`/product/${slug}`, locale)}`;
  const hasPrice = SHOWS_PRICES && product.priceMode !== 'NONE' && Number(product.price) > 0;
  const priceLabel = priceLabelKey(product.type, product.priceMode);
  const condition = product.type === 'PRODUCT' ? conditionKey(product.condition) : undefined;
  const serviceKey = product.type === 'SERVICE' ? serviceTypeKey(product.serviceType) : undefined;
  const mercadilloNames = product.mercadillos.map((mercadillo) => t('MERCADILLO_NAMED', { name: localize(mercadillo.name, locale) }));
  const facts = [condition && t(condition), serviceKey && t(serviceKey), ...mercadilloNames].filter(Boolean);
  const text = printDescription(description ?? '', copies);
  const hasFacts = facts.length > 0 || (product.type === 'EVENT' && (product.startsAt || product.address));
  // Printed in another language, the way back is still in the visitor's own.
  const ownLocale = await getOwnLocale();

  return (
    // Each copy lies across: one or four of them fill an A4 lying down, two an upright one.
    <main className={cn(styles.page, copies !== 2 && styles.landscape)} style={{ '--print-accent': EMAIL_COLORS.primary } as React.CSSProperties}>
      {copies !== 2 && <style>{'@page { size: A4 landscape; }'}</style>}
      <PrintToolbar backHref={withLang(`/product/${slug}`, ownLocale)} isFullLoad={ownLocale !== locale} />
      <PrintSheets
        copies={copies}
        listing={{
          logo: BRAND.logo,
          logoAlt: BRAND.name,
          seller: seller?.name || BRAND.name,
          onSite: t('PRINT_ON_SITE', { domain: new URL(SERVER_URL).host.replace(/^www\./, '') }),
          title: name,
          price: hasPrice ? { label: priceLabel && t(priceLabel), amount: formatPriceTag(Number(product.price)) } : undefined,
          facts: hasFacts && (
            <div className={styles.facts}>
              {product.type === 'EVENT' && product.startsAt && (
                <span className={styles.fact}>
                  <CalendarDays aria-hidden /> {formatEventDate(product.startsAt, locale, t('EVENT_TODAY'))}
                </span>
              )}
              {product.type === 'EVENT' && product.address && (
                <span className={styles.fact}>
                  <MapPin aria-hidden /> {product.address}
                </span>
              )}
              {facts.map((fact) => (
                <span key={fact} className={styles.fact}>
                  {fact}
                </span>
              ))}
            </div>
          ),
          phone,
          scanLabel: t('PRINT_SCAN'),
          qr: <WhatsAppQr url={listingUrl} label={t('PRINT_SCAN')} className={styles.qrCode} />,
          photo: photos[photoPosition(foto, printableMedia(pictures))],
          videoLabel: t('PRINT_VIDEO'),
          paragraphs: printParagraphs(text.text),
          moreLabel: t('PRINT_MORE_IN_QR'),
          isCut: text.isCut,
        }}
      />
    </main>
  );
}
