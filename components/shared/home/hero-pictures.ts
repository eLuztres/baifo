import fs from 'node:fs';
import path from 'node:path';

export const HERO_PICTURES_DIR = '/brand/hero';
const PICTURE_FILE = /^(.+?)(-wide|-figure)?\.(webp|jpe?g|png|avif)$/i;

/** One picture of the home slideshow: `tall` for phones, `wide` for screens wider than tall, `figure` a cut-out standing on it. */
export interface HeroPicture {
  name: string;
  tall?: string;
  wide?: string;
  figure?: string;
}

/**
 * The slideshow is whatever sits in public/brand/hero, in file name order: `<name>.webp` (3:4 or square) and/or
 * `<name>-wide.webp` (3:2). A picture with only one of the two shows only on screens of that shape.
 * `<name>-figure.webp` is a transparent cut-out drawn over that picture, so it can move on its own.
 */
export function getHeroPictures(): HeroPicture[] {
  const dir = path.join(process.cwd(), 'public', HERO_PICTURES_DIR);
  if (!fs.existsSync(dir)) return [];

  const pictures = new Map<string, HeroPicture>();
  for (const file of fs.readdirSync(dir).sort()) {
    const match = PICTURE_FILE.exec(file);
    if (!match) continue;
    const [, name, suffix] = match;
    const picture = pictures.get(name) ?? { name };
    picture[suffix === '-wide' ? 'wide' : suffix === '-figure' ? 'figure' : 'tall'] = `${HERO_PICTURES_DIR}/${file}`;
    pictures.set(name, picture);
  }
  // A figure alone has no picture to stand on.
  return [...pictures.values()].filter((picture) => picture.tall || picture.wide);
}

/** `01-newspaper` → `HOME_HERO_ALT_NEWSPAPER`: the order prefix can change without touching the texts. */
export const heroAltKey = (name: string) => `HOME_HERO_ALT_${name.replace(/^\d+-/, '').replace(/-/g, '_').toUpperCase()}`;
