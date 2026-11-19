// The smallest PDF that holds pictures, one filling each page: an iPhone's "Descargar PDF" (#635) needs no more,
// so no PDF library.

export interface PdfPage {
  /** The page's picture as JPEG bytes. */
  jpeg: Uint8Array<ArrayBuffer>;
  /** The picture's size in pixels. */
  width: number;
  height: number;
  /** The page's size in points (1/72 inch). */
  pageWidth: number;
  pageHeight: number;
}

/** A PDF file made of these pictures, one page each. */
export function jpegPdf(pages: PdfPage[]): Blob {
  const parts: (string | Uint8Array<ArrayBuffer>)[] = [];
  const offsets: number[] = [];
  let length = 0;
  // The text is plain ASCII, so a string's length is its size in bytes.
  const write = (part: string | Uint8Array<ArrayBuffer>) => {
    parts.push(part);
    length += part.length;
  };
  // Every object's place in the file goes into the table at the end, where readers look things up.
  const object = (id: number, ...content: (string | Uint8Array<ArrayBuffer>)[]) => {
    offsets[id] = length;
    write(`${id} 0 obj\n`);
    content.forEach(write);
    write('\nendobj\n');
  };

  // 1 is the document, 2 its list of pages; each page then takes three: the page, its picture, its drawing.
  const pageId = (index: number) => 3 + index * 3;
  const objectCount = pageId(pages.length);
  write('%PDF-1.4\n');
  object(1, '<< /Type /Catalog /Pages 2 0 R >>');
  object(2, `<< /Type /Pages /Kids [${pages.map((_, index) => `${pageId(index)} 0 R`).join(' ')}] /Count ${pages.length} >>`);
  pages.forEach(({ jpeg, width, height, pageWidth, pageHeight }, index) => {
    const id = pageId(index);
    const drawing = `q ${pageWidth} 0 0 ${pageHeight} 0 0 cm /Picture Do Q`;
    object(id, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /Picture ${id + 1} 0 R >> >> /Contents ${id + 2} 0 R >>`);
    object(id + 1, `<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`, jpeg, '\nendstream');
    object(id + 2, `<< /Length ${drawing.length} >>\nstream\n${drawing}\nendstream`);
  });
  const table = length;
  write(`xref\n0 ${objectCount}\n0000000000 65535 f \n`);
  for (let id = 1; id < objectCount; id++) write(`${String(offsets[id]).padStart(10, '0')} 00000 n \n`);
  write(`trailer\n<< /Size ${objectCount} /Root 1 0 R >>\nstartxref\n${table}\n%%EOF\n`);
  return new Blob(parts, { type: 'application/pdf' });
}
