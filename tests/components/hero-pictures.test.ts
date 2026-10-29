import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { getHeroPictures, heroAltKey } from '@/components/shared/home/hero-pictures';

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
