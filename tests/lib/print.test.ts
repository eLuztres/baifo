import { fitPhotoGrid, minPhotoWidth, parseCopies, printDescription, printParagraphs, selectionSheets } from '@/lib/print';

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

describe('fitPhotoGrid', () => {
  it('puts five photos in two rows when the box is tall', () => {
    const { columns, width } = fitPhotoGrid(700, 700, 5, 10);
    expect(columns).toBe(3);
    expect(width).toBeCloseTo((700 - 20) / 3);
  });

  it('puts them in one row when the box is low, smaller', () => {
    const { columns, width } = fitPhotoGrid(700, 200, 5, 10);
    expect(columns).toBe(5);
    expect(width).toBeCloseTo(132);
  });

  it('never gives more columns than photos', () => {
    expect(fitPhotoGrid(700, 300, 2, 10).columns).toBe(2);
  });

  it('knows the smallest size: five across the sheet', () => {
    expect(minPhotoWidth(700, 10)).toBe(132);
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
