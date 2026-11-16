'use client';

import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react';
import { Phone } from 'lucide-react';
import { fitPhotoGrid, minPhotoWidth, type PrintCopies } from '@/lib/print';
import styles from './print-sheet.module.css';

export interface PrintPhoto {
  src: string;
  isVideo: boolean;
}

export interface PrintListing {
  logo: string;
  logoAlt: string;
  domain: string;
  title: string;
  price?: string;
  facts: ReactNode;
  offeredBy?: string;
  phone?: string | null;
  scanLabel: string;
  qr: ReactNode;
  photos: PrintPhoto[];
  videoLabel: string;
  paragraphs: string[];
  textLength: number;
  moreLabel?: string;
}

interface PrintSheetsProps {
  listing: PrintListing;
  copies: PrintCopies;
}

// Where each copy sits on the A4 sheet (mm) and how it is turned: halves lie sideways, one above the other.
const PLACES: Record<PrintCopies, { x: number; y: number; isTurned?: boolean }[]> = {
  1: [{ x: 0, y: 0 }],
  2: [{ x: 0, y: 148.5, isTurned: true }, { x: 0, y: 297, isTurned: true }],
  4: [{ x: 0, y: 0 }, { x: 105, y: 0 }, { x: 0, y: 148.5 }, { x: 105, y: 148.5 }],
};
const SCALE: Record<PrintCopies, number> = { 1: 1, 2: Math.SQRT1_2, 4: 0.5 };

/** The listing on an A4 sheet, once or as 2 or 4 smaller copies to cut out. */
export default function PrintSheets({ listing, copies }: PrintSheetsProps) {
  const paper = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const fitAll = () => paper.current?.querySelectorAll<HTMLElement>(`.${styles.listing}`).forEach((sheet) => fitSheet(sheet, listing.textLength));
    fitAll();
    document.fonts.ready.then(fitAll);
  }, [listing.textLength, copies]);

  useAutoPrint(paper);

  return (
    <div ref={paper} className={styles.sheet}>
      {PLACES[copies].map(({ x, y, isTurned }, index) => (
        <div
          key={index}
          className={styles.cell}
          style={{ transform: `translate(${x}mm, ${y}mm)${isTurned ? ' rotate(-90deg)' : ''} scale(${SCALE[copies]})` }}
        >
          <ListingSheet listing={listing} />
        </div>
      ))}
      {copies === 2 && <span className={styles.cutAcross} />}
      {copies === 4 && (
        <>
          <span className={styles.cutAcross} />
          <span className={styles.cutDown} />
        </>
      )}
    </div>
  );
}

function ListingSheet({ listing }: { listing: PrintListing }) {
  const { logo, logoAlt, domain, title, price, facts, offeredBy, phone, scanLabel, qr, photos, videoLabel, paragraphs, moreLabel } = listing;
  return (
    <article className={styles.listing}>
      <header className={styles.header}>
        {/* eslint-disable-next-line @next/next/no-img-element -- printed as is, no resizing needed */}
        <img src={logo} alt={logoAlt} className={styles.logo} />
        <span className={styles.domain}>{domain}</span>
      </header>
      <div className={styles.heading}>
        <h1 className={styles.title}>{title}</h1>
        {price && <span className={styles.price}>{price}</span>}
      </div>
      {facts}
      <div className={styles.contact}>
        <div className={styles.contactText}>
          {offeredBy && <p className={styles.offeredBy}>{offeredBy}</p>}
          {phone && (
            <p className={styles.phone}>
              <Phone aria-hidden /> {phone}
            </p>
          )}
          <p className={styles.scan}>{scanLabel}</p>
        </div>
        <div className={styles.qr}>{qr}</div>
      </div>
      <div className={styles.photos} data-photos>
        <div className={styles.photoGrid} data-grid>
          {photos.map(({ src, isVideo }, index) => (
            <div key={index} className={styles.photo}>
              {/* eslint-disable-next-line @next/next/no-img-element -- next/image would lazy-load and miss the print */}
              <img src={src} alt='' />
              {isVideo && <span className={styles.videoMark}>▶ {videoLabel}</span>}
            </div>
          ))}
        </div>
      </div>
      <div className={styles.description} data-description>
        {paragraphs.map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
        {moreLabel && <p className={styles.more}>{moreLabel}</p>}
      </div>
    </article>
  );
}

// Photos take what the text leaves. Room they can't use (they stay 3:4) makes the text bigger; a very long text gets
// smaller instead, and the photos never shrink below five in a row.
const BASE_PT = 10.5;
const LONG_PT = 9.5;
const LONG_TEXT = 2000;
const GROW_PT = [11.5, 12.5, 13.5, 14.5];
const SHRINK_PT = [10, 9.5, 9, 8.5, 8];
const SMALLEST_PT = 7.5;
const GAP_PX = 11;

function fitSheet(sheet: HTMLElement, textLength: number) {
  const box = sheet.querySelector<HTMLElement>('[data-photos]')!;
  const grid = sheet.querySelector<HTMLElement>('[data-grid]')!;
  const text = sheet.querySelector<HTMLElement>('[data-description]')!;
  const count = grid.children.length;
  sheet.classList.remove(styles.compact);
  text.classList.remove(styles.columns);
  box.style.minHeight = '';

  const layout = (pt: number) => {
    text.style.fontSize = `${pt}pt`;
    const { width, columns } = fitPhotoGrid(box.clientWidth, box.clientHeight, count, GAP_PX);
    grid.style.setProperty('--photo-width', `${width}px`);
    grid.style.maxWidth = `${columns * width + (columns - 1) * GAP_PX}px`;
    return width;
  };
  if (count === 0) {
    layout(textLength > LONG_TEXT ? LONG_PT : BASE_PT);
    return;
  }

  const start = textLength > LONG_TEXT ? LONG_PT : BASE_PT;
  let size = layout(start);
  const smallest = minPhotoWidth(box.clientWidth, GAP_PX);
  if (size < smallest) {
    for (const pt of SHRINK_PT.filter((step) => step < start)) {
      size = layout(pt);
      if (size >= smallest) return;
    }
    keepSmallestPhotos(sheet, box, text, smallest, layout);
    return;
  }
  if (start !== BASE_PT) return;
  for (const pt of GROW_PT) {
    const grown = layout(pt);
    if (grown < size - 1) {
      layout(pt - 1);
      return;
    }
    size = grown;
  }
}

/** Very long texts only, one step at a time: a tighter contact box, two text columns, then 7.5 pt. */
function keepSmallestPhotos(sheet: HTMLElement, box: HTMLElement, text: HTMLElement, smallest: number, layout: (pt: number) => number) {
  box.style.minHeight = `${(smallest * 4) / 3}px`;
  const overflows = () => sheet.scrollHeight > sheet.clientHeight + 1;
  let pt = SHRINK_PT.at(-1)!;
  layout(pt);
  const steps = [() => sheet.classList.add(styles.compact), () => text.classList.add(styles.columns), () => (pt = SMALLEST_PT)];
  for (const step of steps) {
    if (!overflows()) return;
    step();
    layout(pt);
  }
}

// The print choice links with ?imprimir=1.
const PRINT_NOW = 'imprimir';

/** Coming from the print choice: opens the browser's print (or PDF) once the pictures are in. */
function useAutoPrint(paper: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    // The live address, not the server's props: Next keeps those for back and forward, which would print again.
    if (new URL(window.location.href).searchParams.get(PRINT_NOW) !== '1') return;
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
