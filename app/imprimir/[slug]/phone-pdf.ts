import { jpegPdf, type PdfPage } from '@/lib/jpeg-pdf';
import styles from './print-sheet.module.css';

// An iPhone's print has no "Save as PDF" one finds: there, "Descargar PDF" makes the file itself, as pictures of the
// sheets (#635). Android and computers print as before.

/** iPhones and iPads; an iPad says it is a Mac, only one with a touch screen. */
export const isApplePhone = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

// A4 in points, the sheet upright or lying down.
const A4_SHORT = 595.28;
const A4_LONG = 841.89;
// About 290 dpi: sharp on paper, and within the 16.7 million pixels an iPhone allows a picture.
const SCALE = 3;
const JPEG_QUALITY = 0.92;

async function sheetPage(sheet: HTMLElement): Promise<PdfPage> {
  // Loaded on iPhones only.
  const { domToCanvas } = await import('modern-screenshot');
  // Its real size, not the phone's scaled-down view (useSheetZoom).
  const canvas = await domToCanvas(sheet, {
    scale: SCALE,
    width: sheet.offsetWidth,
    height: sheet.offsetHeight,
    style: { transform: 'none', margin: '0', boxShadow: 'none' },
    // The library drops a transform-origin that matches a bare element's: the copies on a half or quarter sheet need theirs.
    onCloneEachNode: (node) => {
      if (node instanceof HTMLElement && node.classList.contains(styles.cell)) node.style.transformOrigin = 'top left';
    },
  });
  const blob = await new Promise<Blob | null>((done) => canvas.toBlob(done, 'image/jpeg', JPEG_QUALITY));
  const { width, height } = canvas;
  // Freed now, not whenever Safari gets to it: a long selección's pictures would pass its memory limit for pictures.
  canvas.width = canvas.height = 0;
  if (!blob) throw new Error('The sheet could not be drawn');
  const isLyingDown = sheet.offsetWidth > sheet.offsetHeight;
  return {
    jpeg: new Uint8Array(await blob.arrayBuffer()),
    width,
    height,
    pageWidth: isLyingDown ? A4_LONG : A4_SHORT,
    pageHeight: isLyingDown ? A4_SHORT : A4_LONG,
  };
}

/** The sheets as a PDF file, named after the page as the browser's own "Save as PDF" does. */
export async function sheetsPdf(sheets: HTMLElement[]) {
  const pages: PdfPage[] = [];
  // One at a time: a phone holds one big picture in memory at once.
  for (const sheet of sheets) pages.push(await sheetPage(sheet));
  const name = document.title.replace(/[\\/:*?"<>|]+/g, '-').trim() || 'baifo';
  return new File([jpegPdf(pages)], `${name}.pdf`, { type: 'application/pdf' });
}

/** The phone's share menu (Save to Files, Print, WhatsApp) with the PDF; where there is none, a download. */
export async function handOverPdf(file: File) {
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
    }
  }
  const url = URL.createObjectURL(file);
  Object.assign(document.createElement('a'), { href: url, download: file.name }).click();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
