import { jpegPdf } from '@/lib/jpeg-pdf';

// A JPEG's bytes don't matter to the file's structure.
const page = (pageWidth: number, pageHeight: number) => ({ jpeg: new Uint8Array([0xff, 0xd8, 0xff, 0xd9]), width: 30, height: 20, pageWidth, pageHeight });

const pdfText = async (blob: Blob) => Buffer.from(await blob.arrayBuffer()).toString('latin1');

describe('jpegPdf', () => {
  it('makes a PDF with one page per picture, each the size it is given', async () => {
    const blob = jpegPdf([page(841.89, 595.28), page(595.28, 841.89)]);
    const text = await pdfText(blob);
    expect(blob.type).toBe('application/pdf');
    expect(text.startsWith('%PDF-1.4\n')).toBe(true);
    expect(text.endsWith('%%EOF\n')).toBe(true);
    expect(text).toContain('/Kids [3 0 R 6 0 R] /Count 2');
    expect(text).toContain('/MediaBox [0 0 841.89 595.28]');
    expect(text).toContain('/MediaBox [0 0 595.28 841.89]');
    expect(text).toContain('/Width 30 /Height 20 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length 4');
  });

  it("points its table at every object, where readers look them up", async () => {
    const text = await pdfText(jpegPdf([page(595.28, 841.89)]));
    const table = Number(text.match(/startxref\n(\d+)/)?.[1]);
    expect(text.slice(table).startsWith('xref\n0 6\n')).toBe(true);
    const offsets = text.slice(table).split('\n').slice(3, 8).map((line) => Number(line.slice(0, 10)));
    offsets.forEach((offset, index) => expect(text.slice(offset).startsWith(`${index + 1} 0 obj\n`)).toBe(true));
  });
});
