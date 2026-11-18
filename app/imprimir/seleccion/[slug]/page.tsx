import type { Metadata } from 'next';
import { cache } from 'react';
import { notFound } from 'next/navigation';
import { CalendarDays } from 'lucide-react';
import { prisma } from '@/db/prisma';
import WhatsAppQr from '@/components/shared/whatsapp-qr';
import { type CollectionRing, getInStockRings } from '@/components/shared/home/in-stock-rings';
import { BRAND, EMAIL_COLORS } from '@/lib/brand';
import { SERVER_URL, SHOWS_PRICES } from '@/lib/constants';
import { formatEventDate } from '@/lib/event-date';
import { withLang } from '@/lib/i18n-core';
import { getT } from '@/lib/i18n-server';
import { priceLabelKey } from '@/lib/listing-labels';
import { localize, localizeProduct } from '@/lib/localize';
import { listingsOf } from '@/lib/mercadillos';
import { selectionSheets } from '@/lib/print';
import { cn, formatPriceTag } from '@/lib/utils';
import { pictureOf, throughSite } from '@/lib/video';
import { PrintToolbar } from '../../[slug]/print-controls';
import printStyles from '../../[slug]/print-sheet.module.css';
import styles from './selection-sheet.module.css';

interface PrintSelectionPageProps {
  params: Promise<{ slug: string }>;
}

// Once per request, for the title and the page.
const findSelection = cache((slug: string) => prisma.mercadillo.findUnique({ where: { slug }, include: { tags: { select: { id: true } } } }));

export async function generateMetadata({ params }: PrintSelectionPageProps): Promise<Metadata> {
  const { slug } = await params;
  const [selection, { locale }] = await Promise.all([findSelection(slug), getT()]);
  // The title is the PDF's file name.
  return { title: selection ? localize(selection.name, locale) : undefined, robots: { index: false, follow: false } };
}

/** A selección on A4 sheets, in the visitor's language: its name, text and a QR to it, then every listing with its own QR. */
export default async function PrintSelectionPage({ params }: PrintSelectionPageProps) {
  const { slug } = await params;
  const [selection, { t, locale }] = await Promise.all([findSelection(slug), getT()]);
  if (!selection) notFound();

  const listings = await getInStockRings(listingsOf(selection.id, selection.tags.map((tag) => tag.id)));
  const name = localize(selection.name, locale);
  const text = localize(selection.text, locale);
  const domain = new URL(SERVER_URL).host;
  const linkTo = (path: string) => `${SERVER_URL}${withLang(path, locale)}`;
  const priceOf = (listing: CollectionRing) => {
    if (!SHOWS_PRICES || !listing.price || listing.priceMode === 'NONE' || Number(listing.price) <= 0) return undefined;
    const label = priceLabelKey(listing.type, listing.priceMode);
    return { label: label && t(label), amount: formatPriceTag(Number(listing.price)) };
  };
  const sheets = selectionSheets(listings);

  return (
    <main className={printStyles.page} style={{ '--print-accent': EMAIL_COLORS.primary } as React.CSSProperties}>
      <PrintToolbar backHref={`/explore?seleccion=${slug}`} backLabel={t('PRINT_BACK_SELECTION')} />
      {sheets.map((sheet, index) => (
        <div key={index} className={cn(printStyles.sheet, styles.sheet)}>
          <article className={styles.selection}>
            <header className={printStyles.header}>
              {/* eslint-disable-next-line @next/next/no-img-element -- printed as is, no resizing needed */}
              <img src={BRAND.logo} alt={BRAND.name} className={printStyles.logo} />
              <span className={printStyles.domain}>{domain}</span>
            </header>
            {index === 0 && (
              <>
                <div className={styles.top}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- next/image would lazy-load and miss the print */}
                  {selection.icon && <img src={throughSite(selection.icon)} alt='' className={styles.icon} />}
                  <div className={styles.about}>
                    <h1 className={styles.name}>{name}</h1>
                    {text && <p className={styles.text}>{text}</p>}
                  </div>
                  <div className={styles.selectionQr}>
                    <WhatsAppQr url={linkTo(`/explore?seleccion=${slug}`)} label={t('PRINT_SELECTION_SCAN')} className={printStyles.qrCode} />
                    <p>{t('PRINT_SELECTION_SCAN')}</p>
                  </div>
                </div>
                <p className={styles.count}>
                  <span>{listings.length === 1 ? t('MERCADILLO_COUNT_ONE') : t('MERCADILLO_COUNT', { count: listings.length })}</span>
                  <span>{t('PRINT_SELECTION_EACH')}</span>
                </p>
              </>
            )}
            <ul className={styles.grid}>
              {sheet.map((listing) => {
                const picture = pictureOf(listing.image);
                const price = priceOf(listing);
                return (
                  <li key={listing.id} className={styles.item}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- next/image would lazy-load and miss the print */}
                    {picture ? <img src={throughSite(picture)} alt='' className={styles.photo} /> : <span className={styles.photo} />}
                    <div className={styles.info}>
                      <p className={styles.listingName}>{localizeProduct(listing, locale).name}</p>
                      {listing.type === 'EVENT' && listing.startsAt && (
                        <p className={styles.when}>
                          <CalendarDays aria-hidden /> {formatEventDate(listing.startsAt, locale, t('EVENT_TODAY'))}
                        </p>
                      )}
                      {price && (
                        <p className={styles.price}>
                          {/* Small, on its own line: "Presupuesto hasta" at the price's size didn't fit beside the QR. */}
                          {price.label && <span className={styles.priceLabel}>{price.label}</span>}
                          {price.amount}
                        </p>
                      )}
                    </div>
                    <div className={styles.listingQr}>
                      <WhatsAppQr url={linkTo(`/product/${listing.slug}`)} label={t('PRINT_LISTING_SCAN')} className={printStyles.qrCode} />
                      <span>{t('PRINT_LISTING_SCAN')}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
            <footer className={styles.footer}>
              <span>
                {name} · {domain}
              </span>
              {sheets.length > 1 && <span>{t('MERCADILLO_PAGE', { page: index + 1, pages: sheets.length })}</span>}
            </footer>
          </article>
        </div>
      ))}
    </main>
  );
}
