'use client';

import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react';
import { Phone } from 'lucide-react';
import type { PrintCopies } from '@/lib/print';
import { cn } from '@/lib/utils';
import { isApplePhone } from './phone-pdf';
import styles from './print-sheet.module.css';

export interface PrintPhoto {
  src: string;
  isVideo: boolean;
}

export interface PrintListing {
  logo: string;
  logoAlt: string;
  /** Who offers it, at the top as on a social post; the shop's name for its own listings. */
  seller: string;
  onSite: string;
  title: string;
  price?: { label?: string; amount: string };
  facts: ReactNode;
  phone?: string | null;
  scanLabel: string;
  qr: ReactNode;
  photo?: PrintPhoto;
  videoLabel: string;
  paragraphs: string[];
  moreLabel: string;
  /** The text was cut short for a half or quarter sheet. */
  isCut: boolean;
}

interface PrintSheetsProps {
  listing: PrintListing;
  copies: PrintCopies;
}

// Where each copy sits on the sheet (in its millimetres, --mm). Every copy lies across: two share an upright A4, one
// above the other, and one or four fill an A4 lying down.
const PLACES: Record<PrintCopies, { x: number; y: number }[]> = {
  1: [{ x: 0, y: 0 }],
  2: [{ x: 0, y: 0 }, { x: 0, y: 148.5 }],
  4: [{ x: 0, y: 0 }, { x: 148.5, y: 0 }, { x: 0, y: 105 }, { x: 148.5, y: 105 }],
};
const SCALE: Record<PrintCopies, number> = { 1: 1, 2: Math.SQRT1_2, 4: 0.5 };

/** The listing on an A4 sheet, once or as 2 or 4 smaller copies to cut out. */
export default function PrintSheets({ listing, copies }: PrintSheetsProps) {
  const paper = useRef<HTMLDivElement>(null);
  const text = listing.paragraphs.join('\n');

  useLayoutEffect(() => {
    const fitAll = () => paper.current?.querySelectorAll<HTMLElement>('[data-caption]').forEach(fitCaption);
    fitAll();
    document.fonts.ready.then(fitAll);
  }, [text, copies]);

  useAutoPrint(paper);

  return (
    <div className={styles.paper}>
      <div ref={paper} className={styles.sheet}>
        {PLACES[copies].map(({ x, y }, index) => (
          <div key={index} className={styles.cell} style={{ transform: `translate(calc(${x} * var(--mm)), calc(${y} * var(--mm))) scale(${SCALE[copies]})` }}>
            <ListingSheet listing={listing} />
          </div>
        ))}
        {copies > 1 && <span className={styles.cutAcross} />}
        {copies === 4 && <span className={styles.cutDown} />}
      </div>
    </div>
  );
}

function ListingSheet({ listing }: { listing: PrintListing }) {
  const { logo, logoAlt, seller, onSite, title, price, facts, phone, scanLabel, qr, photo, videoLabel, paragraphs, moreLabel, isCut } = listing;
  return (
    <article className={styles.listing}>
      {photo && (
        <div className={styles.photo}>
          {/* eslint-disable-next-line @next/next/no-img-element -- next/image would lazy-load and miss the print */}
          <img src={photo.src} alt='' />
          {photo.isVideo && <span className={styles.videoMark}>▶ {videoLabel}</span>}
        </div>
      )}
      <div className={styles.side}>
        <header className={styles.who}>
          <span className={styles.avatar} aria-hidden>
            <span>{firstLetter(seller)}</span>
          </span>
          <div className={styles.whoText}>
            <p className={styles.seller}>{seller}</p>
            <p className={styles.onSite}>{onSite}</p>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element -- printed as is, no resizing needed */}
          <img src={logo} alt={logoAlt} className={styles.whoLogo} />
        </header>
        <div className={styles.rule} />
        <div className={styles.heading}>
          <h1 className={styles.title}>{title}</h1>
          {price && (
            <p className={styles.price}>
              {/* Small, on its own line: "Presupuesto hasta" at the price's size left no room for the title. */}
              {price.label && <span className={styles.priceLabel}>{price.label}</span>}
              {price.amount}
            </p>
          )}
        </div>
        {facts}
        <div className={cn(styles.caption, isCut && styles.cut)} data-caption>
          {paragraphs.map((paragraph, index) => (
            <p key={index}>
              {index === 0 && <strong>{seller} </strong>}
              {paragraph}
            </p>
          ))}
        </div>
        <p className={styles.more}>{moreLabel}</p>
        <div className={styles.contact}>
          <div className={styles.contactText}>
            {phone && (
              <p className={styles.phone}>
                <Phone aria-hidden /> {phone}
              </p>
            )}
            <p className={styles.scan}>{scanLabel}</p>
          </div>
          <div className={styles.qr}>{qr}</div>
        </div>
      </div>
    </article>
  );
}

/** A name's first letter as one sees it: a flag or joined emoji stays whole. */
const firstLetter = (name: string) => new Intl.Segmenter().segment(name)[Symbol.iterator]().next().value?.segment.toUpperCase();

// The text beside the photo gets the biggest size that fits; one too long even at the smallest fades out and points to
// the QR. Measured on screen, where the sheet is real size, and set in the sheet's own unit (--pt), so a print that
// shrinks the sheet keeps the same layout.
const CAPTION_PT = [14, 13, 12, 11, 10.5, 10, 9.5, 9];

function fitCaption(caption: HTMLElement) {
  caption.classList.remove(styles.faded);
  const fits = (pt: number) => {
    caption.style.fontSize = `calc(${pt} * var(--pt))`;
    return caption.scrollHeight <= caption.clientHeight + 1;
  };
  if (!CAPTION_PT.some(fits)) caption.classList.add(styles.faded);
}

// The print choice links with ?imprimir=1.
const PRINT_NOW = 'imprimir';

/** Coming from the print choice: opens the browser's print (or PDF) once the pictures are in. */
function useAutoPrint(paper: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    // The live address, not the server's props: Next keeps those for back and forward, which would print again.
    if (new URL(window.location.href).searchParams.get(PRINT_NOW) !== '1') return;
    // An iPhone's print can't save a PDF: there the page waits for "Descargar PDF" and its share menu, Print included.
    if (isApplePhone()) return;
    const images = Array.from(paper.current?.querySelectorAll('img') ?? []);
    const loaded = images.map((image) =>
      image.complete
        ? Promise.resolve()
        : new Promise((done) => {
            image.addEventListener('load', done, { once: true });
            image.addEventListener('error', done, { once: true });
          })
    );
    let isGone = false;
    Promise.race([Promise.all(loaded), new Promise((done) => setTimeout(done, 4000))])
      .then(() => document.fonts.ready)
      .then(() => {
        if (isGone) return;
        // Cleaned only now, when it prints (React runs effects twice in development): back, forward and reload don't print again.
        const url = new URL(window.location.href);
        url.searchParams.delete(PRINT_NOW);
        window.history.replaceState(window.history.state, '', url);
        window.print();
      });
    return () => {
      isGone = true;
    };
  }, [paper]);
}
