'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Download } from 'lucide-react';
import { useI18n } from '@/components/i18n-provider';
import { Button } from '@/components/ui/button';
import styles from './print-sheet.module.css';

/** Above the sheet on screen only: the way back and the download. */
export function PrintToolbar({ backHref }: { backHref: string }) {
  const { t } = useI18n();
  useSheetZoom();
  return (
    <div className={styles.toolbar}>
      <Button asChild variant='ghost' size='icon' className='rounded-full' aria-label={t('PRINT_BACK')} title={t('PRINT_BACK')}>
        <Link href={backHref}>
          <ArrowLeft />
        </Link>
      </Button>
      <Button className='rounded-full' onClick={() => window.print()}>
        <Download /> {t('PRINT_DOWNLOAD_PDF')}
      </Button>
    </div>
  );
}

// The A4 sheet in px at 96 dpi, plus the page's 16px gutters.
const SHEET_WIDTH_PX = 794;
const GUTTERS_PX = 32;

/** Shrinks the A4 sheet to fit a phone's width on screen; printing ignores it. CSS can't divide 100vw by a length. */
function useSheetZoom() {
  useEffect(() => {
    const fit = () => document.documentElement.style.setProperty('--sheet-zoom', String(Math.min(1, (window.innerWidth - GUTTERS_PX) / SHEET_WIDTH_PX)));
    fit();
    window.addEventListener('resize', fit);
    return () => {
      window.removeEventListener('resize', fit);
      document.documentElement.style.removeProperty('--sheet-zoom');
    };
  }, []);
}

interface NotesBoxProps {
  label: string;
  placeholder: string;
}

/** Ruled lines for the person's own words: typed here before printing, or written on the paper by hand. */
export function NotesBox({ label, placeholder }: NotesBoxProps) {
  return (
    <label className={styles.notes}>
      <span className={styles.notesLabel}>{label}</span>
      <textarea placeholder={placeholder} className={styles.notesText} maxLength={600} />
    </label>
  );
}
