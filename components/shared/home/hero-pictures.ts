import fs from 'node:fs';
import path from 'node:path';

export const HERO_PICTURES_DIR = '/brand/hero';
const PICTURE_FILE = /^(.+?)(-wide)?\.(webp|jpe?g|png|avif)$/i;

/** One picture of the home slideshow: `tall` for phones, `wide` for screens wider than tall. */
export interface HeroPicture {
  name: string;
  tall?: string;
  wide?: string;
}

/**
 * The slideshow is whatever sits in public/brand/hero, in file name order: `<name>.webp` (3:4 or square) and/or
 * `<name>-wide.webp` (3:2). A picture with only one of the two shows only on screens of that shape.
 */
export function getHeroPictures(): HeroPicture[] {
  const dir = path.join(process.cwd(), 'public', HERO_PICTURES_DIR);
  if (!fs.existsSync(dir)) return [];

  const pictures = new Map<string, HeroPicture>();
  for (const file of fs.readdirSync(dir).sort()) {
    const match = PICTURE_FILE.exec(file);
    if (!match) continue;
    const [, name, wide] = match;
    const picture = pictures.get(name) ?? { name };
    picture[wide ? 'wide' : 'tall'] = `${HERO_PICTURES_DIR}/${file}`;
    pictures.set(name, picture);
  }
  return [...pictures.values()];
}

/** `01-newspaper` → `HOME_HERO_ALT_NEWSPAPER`: the order prefix can change without touching the texts. */
export const heroAltKey = (name: string) => `HOME_HERO_ALT_${name.replace(/^\d+-/, '').replace(/-/g, '_').toUpperCase()}`;
