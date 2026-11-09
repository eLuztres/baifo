import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { CalendarDays, MapPin, Phone } from 'lucide-react';
import { prisma } from '@/db/prisma';
import WhatsAppQr from '@/components/shared/whatsapp-qr';
import { getProductBySlug } from '@/lib/actions/product.actions';
import { BRAND, EMAIL_COLORS } from '@/lib/brand';
import { conditionKey, CONTACT_LIMIT, SERVER_URL, SHOWS_PRICES } from '@/lib/constants';
import { formatEventDate } from '@/lib/event-date';
import { withLang } from '@/lib/i18n-core';
import { getT } from '@/lib/i18n-server';
import { priceLabelKey, serviceTypeKey } from '@/lib/listing-labels';
import { localize, localizeProduct } from '@/lib/localize';
import { sellerIdentity } from '@/lib/marketplace/seller';
import { isRateLimited } from '@/lib/rate-limit';
import { clientIp } from '@/lib/sign-in-limit';
import { formatPriceTag } from '@/lib/utils';
import { pictureOf } from '@/lib/video';
import { NotesBox, PrintToolbar } from './print-controls';
import styles from './print-sheet.module.css';

interface PrintPageProps {
  params: Promise<{ slug: string }>;
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

/** A listing on one A4 page, in the visitor's language, to print or save as a PDF. */
export default async function PrintListingPage({ params }: PrintPageProps) {
  const { slug } = await params;
  const [product, { t, locale }] = await Promise.all([getProductBySlug(slug), getT()]);
  if (!product) notFound();

  const { name, description } = localizeProduct(product, locale);
  const pictures = product.images.map(pictureOf).filter((picture): picture is string => Boolean(picture));
  const [cover, ...others] = pictures;
  const phone = product.contactPhone ? await sellerPhone(product.id) : BRAND.contact.phone;
  const seller = product.submission && sellerIdentity(product.submission);
  const listingUrl = `${SERVER_URL}${withLang(`/product/${slug}`, locale)}`;
  const hasPrice = SHOWS_PRICES && product.priceMode !== 'NONE' && Number(product.price) > 0;
  const priceLabel = priceLabelKey(product.type, product.priceMode);
  const condition = product.type === 'PRODUCT' ? conditionKey(product.condition) : undefined;
  const serviceKey = product.type === 'SERVICE' ? serviceTypeKey(product.serviceType) : undefined;
  const mercadilloNames = product.mercadillos.map((mercadillo) => t('MERCADILLO_NAMED', { name: localize(mercadillo.name, locale) }));
  const facts = [condition && t(condition), serviceKey && t(serviceKey), ...mercadilloNames].filter(Boolean);

  return (
    <main className={styles.page} style={{ '--print-accent': EMAIL_COLORS.primary } as React.CSSProperties}>
      <PrintToolbar backHref={`/product/${slug}`} />
      <article className={styles.sheet}>
        <header className={styles.header}>
          {/* eslint-disable-next-line @next/next/no-img-element -- printed as is, no resizing needed */}
          <img src={BRAND.logo} alt={BRAND.name} className={styles.logo} />
          <span className={styles.domain}>{new URL(SERVER_URL).host}</span>
        </header>

        <h1 className={styles.title}>{name}</h1>
        <div className={styles.facts}>
          {hasPrice && (
            <span className={styles.price}>
              {priceLabel && `${t(priceLabel)} `}
              {formatPriceTag(Number(product.price))}
            </span>
          )}
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

        <div className={styles.body}>
          {/* eslint-disable-next-line @next/next/no-img-element -- next/image would lazy-load and miss the print */}
          {cover && <img src={cover} alt={name} className={styles.cover} />}
          <div className={styles.side}>
            {description && <p className={styles.description}>{description}</p>}
            <div className={styles.contact}>
              <div className={styles.contactText}>
                {seller?.name && <p>{t('SELLER_OFFERED_BY', { name: seller.name })}</p>}
                {phone && (
                  <p className={styles.phone}>
                    <Phone aria-hidden /> {phone}
                  </p>
                )}
                <p className={styles.scan}>{t('PRINT_SCAN')}</p>
              </div>
              <WhatsAppQr url={listingUrl} label={t('PRINT_SCAN')} className={styles.qr} />
            </div>
          </div>
        </div>

        {others.length > 0 && (
          <div className={styles.thumbs}>
            {others.map((picture) => (
              // eslint-disable-next-line @next/next/no-img-element -- see the cover
              <img key={picture} src={picture} alt='' className={styles.thumb} />
            ))}
          </div>
        )}

        <NotesBox label={t('PRINT_NOTES')} placeholder={t('PRINT_NOTES_HINT')} />
      </article>
    </main>
  );
}
