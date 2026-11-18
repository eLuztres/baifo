import { parseCopies, parsePhoto, printDescription, printParagraphs, printPhotos, selectionSheets } from '@/lib/print';

describe('parseCopies', () => {
  it('takes 1, 2 or 4 and makes anything else a whole sheet', () => {
    expect(parseCopies('2')).toBe(2);
    expect(parseCopies('4')).toBe(4);
    expect(parseCopies('3')).toBe(1);
    expect(parseCopies(undefined)).toBe(1);
  });
});

describe('printDescription', () => {
  const long = 'palabra '.repeat(300).trim();

  it('keeps the whole text on a whole sheet', () => {
    expect(printDescription(long, 1)).toEqual({ text: long, isCut: false });
  });

  it('cuts a long text at a word on half and quarter sheets', () => {
    const half = printDescription(long, 2);
    const quarter = printDescription(long, 4);
    expect(half.isCut).toBe(true);
    expect(half.text.length).toBeLessThanOrEqual(901);
    expect(half.text.endsWith('palabra…')).toBe(true);
    expect(quarter.text.length).toBeLessThanOrEqual(451);
  });

  it('leaves a short text alone', () => {
    expect(printDescription('Tabla en buen estado.', 4)).toEqual({ text: 'Tabla en buen estado.', isCut: false });
  });
});

describe('printParagraphs', () => {
  it('splits at blank lines and keeps single line breaks', () => {
    expect(printParagraphs('Uno\ndos\n\n\nTres\n  \n')).toEqual(['Uno\ndos', 'Tres']);
  });
});

describe('printPhotos', () => {
  it('prints photos through this site, a video as its still and without one not at all', () => {
    const photo = 'https://rf1rilwah0.ufs.sh/f/photo-key';
    expect(printPhotos([photo, 'https://example.com/clip.mp4'])).toEqual([{ src: '/file/photo-key', isVideo: false }]);
  });
});

describe('parsePhoto', () => {
  it('takes one of the photos and makes anything else the first', () => {
    expect(parsePhoto('2', 3)).toBe(2);
    expect(parsePhoto('3', 3)).toBe(0);
    expect(parsePhoto('-1', 3)).toBe(0);
    expect(parsePhoto('1.5', 3)).toBe(0);
    expect(parsePhoto(undefined, 3)).toBe(0);
    expect(parsePhoto('0', 0)).toBe(0);
  });
});

describe('selectionSheets', () => {
  const listings = (count: number) => Array.from({ length: count }, (_, index) => index);

  it('keeps one sheet for none or a few', () => {
    expect(selectionSheets([])).toEqual([[]]);
    expect(selectionSheets(listings(8))).toEqual([listings(8)]);
  });

  it('puts fewer on the first sheet, then the same number on each after', () => {
    expect(selectionSheets(listings(9)).map((sheet) => sheet.length)).toEqual([8, 1]);
    expect(selectionSheets(listings(29)).map((sheet) => sheet.length)).toEqual([8, 10, 10, 1]);
    expect(selectionSheets(listings(29)).flat()).toEqual(listings(29));
  });
});
