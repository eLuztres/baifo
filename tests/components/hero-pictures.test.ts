import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { getHeroPictures, heroAltKey, startAtRandom } from '@/components/shared/home/hero-pictures';

describe('getHeroPictures', () => {
  it('pairs each picture with its wide version and cut-out figure, in file name order', () => {
    const pictures = getHeroPictures();

    expect(pictures[0]).toEqual({
      name: '00-lobos',
      tall: '/brand/hero/00-lobos.webp',
      wide: '/brand/hero/00-lobos-wide.webp',
      figure: '/brand/hero/00-lobos-figure.webp',
    });
    expect(pictures[1]).toEqual({
      name: '01-newspaper',
      tall: '/brand/hero/01-newspaper.webp',
      wide: '/brand/hero/01-newspaper-wide.webp',
    });
    expect(pictures.find((picture) => picture.name === '05-terrace')).toEqual({ name: '05-terrace', tall: '/brand/hero/05-terrace.webp' });
  });

  describe('in a shop of its own', () => {
    let root: string;

    beforeEach(() => {
      root = fs.mkdtempSync(path.join(os.tmpdir(), 'hero-'));
      jest.spyOn(process, 'cwd').mockReturnValue(root);
    });
    afterEach(() => {
      jest.restoreAllMocks();
      fs.rmSync(root, { recursive: true, force: true });
    });

    it('has no slideshow without the folder', () => {
      expect(getHeroPictures()).toEqual([]);
    });

    it('skips files that are no pictures and figures without a picture, and keeps a wide-only picture', () => {
      const dir = path.join(root, 'public', 'brand', 'hero');
      fs.mkdirSync(dir, { recursive: true });
      for (const file of ['README.md', '.DS_Store', '02-sea-wide.jpg', '01-hill.PNG', '03-lost-figure.webp']) fs.writeFileSync(path.join(dir, file), '');

      expect(getHeroPictures()).toEqual([
        { name: '01-hill', tall: '/brand/hero/01-hill.PNG' },
        { name: '02-sea', wide: '/brand/hero/02-sea-wide.jpg' },
      ]);
    });
  });

  it('names the alt text after the picture, without its order number', () => {
    expect(heroAltKey('01-newspaper')).toBe('HOME_HERO_ALT_NEWSPAPER');
    expect(heroAltKey('12-old-town')).toBe('HOME_HERO_ALT_OLD_TOWN');
  });
});

describe('startAtRandom', () => {
  const pictures = [
    { name: 'a', tall: 'a.webp', wide: 'a-wide.webp' },
    { name: 'b', tall: 'b.webp' },
    { name: 'c', tall: 'c.webp', wide: 'c-wide.webp' },
    { name: 'd', wide: 'd-wide.webp' },
  ];
  const names = (list: { name: string }[]) => list.map((picture) => picture.name).join('');

  afterEach(() => jest.restoreAllMocks());

  it('keeps every picture in the same turn, only starting elsewhere', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.9);

    expect(names(startAtRandom(pictures))).toBe('cdab');
  });

  it('starts only at a picture drawn for both screen shapes', () => {
    const starts = new Set<string>();
    for (const value of [0, 0.25, 0.5, 0.75, 0.99]) {
      jest.spyOn(Math, 'random').mockReturnValue(value);
      starts.add(startAtRandom(pictures)[0].name);
    }

    expect([...starts].sort()).toEqual(['a', 'c']);
  });

  it('leaves the order alone when no picture has both shapes, and copes with none', () => {
    expect(names(startAtRandom([pictures[1], pictures[3]]))).toBe('bd');
    expect(startAtRandom([])).toEqual([]);
  });
});
