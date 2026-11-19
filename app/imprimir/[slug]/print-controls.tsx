'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Download, Loader2 } from 'lucide-react';
import { useI18n } from '@/components/i18n-provider';
import { Button } from '@/components/ui/button';
import { handOverPdf, isApplePhone, sheetsPdf } from './phone-pdf';
import styles from './print-sheet.module.css';

interface PrintToolbarProps {
  backHref: string;
  /** Where the way back goes, for screen readers; missing: the listing. */
  backLabel?: string;
  /** The way back is in another language: a full page load, so the whole site switches (see print-button.tsx). */
  isFullLoad?: boolean;
}

/** Above the sheet on screen only: the way back and the download. */
export function PrintToolbar({ backHref, backLabel, isFullLoad }: PrintToolbarProps) {
  const { t } = useI18n();
  const back = backLabel ?? t('PRINT_BACK');
  const pdf = usePdfDownload();
  useSheetZoom();
  return (
    <div className={styles.toolbar}>
      <Button asChild variant='ghost' size='icon' className='rounded-full' aria-label={back} title={back}>
        {isFullLoad ? (
          <a href={backHref}>
            <ArrowLeft />
          </a>
        ) : (
          <Link href={backHref}>
            <ArrowLeft />
          </Link>
        )}
      </Button>
      <Button className='rounded-full' onClick={pdf.download} disabled={pdf.isPreparing} aria-busy={pdf.isPreparing}>
        {pdf.isPreparing ? <Loader2 className='animate-spin' /> : <Download />} {t('PRINT_DOWNLOAD_PDF')}
      </Button>
    </div>
  );
}

/** "Descargar PDF": the browser's print, or on an iPhone the PDF it made of the sheets (phone-pdf.ts). */
function usePdfDownload() {
  const pdf = useRef<File>(null);
  const [isPreparing, setIsPreparing] = useState(false);

  // Made beforehand, once the text is fitted: the share menu only opens right on the tap, so the button waits until then.
  useEffect(() => {
    if (!isApplePhone()) return;
    let isGone = false;
    setIsPreparing(true);
    document.fonts.ready
      .then(() => new Promise<number>((done) => requestAnimationFrame(done)))
      .then(() => (isGone ? null : sheetsPdf(Array.from(document.querySelectorAll<HTMLElement>(`.${styles.sheet}`)))))
      .then((file) => {
        if (!isGone) pdf.current = file;
      })
      .catch(() => {}) // without a PDF, the tap prints
      .finally(() => {
        if (!isGone) setIsPreparing(false);
      });
    return () => {
      isGone = true;
    };
  }, []);

  const download = () => (pdf.current ? handOverPdf(pdf.current) : window.print());
  return { download, isPreparing };
}

// The page's 16px gutters.
const GUTTERS_PX = 32;

/** Scales the A4 sheet (upright or lying down) to a phone's width on screen; printing ignores it. CSS can't divide 100vw by a length. */
function useSheetZoom() {
  useEffect(() => {
    // Its unscaled width: a transform leaves offsetWidth alone.
    const sheetWidth = document.querySelector<HTMLElement>(`.${styles.sheet}`)?.offsetWidth ?? 794;
    const fit = () => document.documentElement.style.setProperty('--sheet-zoom', String(Math.min(1, (window.innerWidth - GUTTERS_PX) / sheetWidth)));
    fit();
    window.addEventListener('resize', fit);
    return () => {
      window.removeEventListener('resize', fit);
      document.documentElement.style.removeProperty('--sheet-zoom');
    };
  }, []);
}
