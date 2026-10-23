#!/usr/bin/env node
// AI product studio: turns raw product photos into shop-ready product images and texts.
//   npm run studio -- pull                     copy the Drive inbox (rclone) to STUDIO_DIR/inbox
//   npm run studio -- generate [--only id] [--force]
//   npm run studio -- regenerate <id> [hero|side|top]
//   npm run studio -- reject <id> <side|top>   drop one generated angle
//   npm run studio -- review                   write STUDIO_DIR/review.html
//   npm run studio -- upload                   upload approved images to UploadThing
//   npm run studio -- push                     sync everything to Drive (also runs by itself after each generation)
//   npm run studio -- cutouts [--only slug] [--force]
//       floating rings for the home page: isolated AI shot of each public/brand/products/<slug>.jpg in
//       STUDIO_DIR/cutouts, saved as public/brand/products/cutout/<slug>.webp and listed in brand/cutouts.json.
// Images and texts come from OpenAI (OPENAI_API_KEY in .env).
// Drive layout: inbox/<id>/ is the drop zone; rings/<id>/ holds everything about one ring
//   (original/ raw photos + info.txt, views/ hero|side|top.jpg, details/ extra shots, product.json);
//   shop/ mirrors the shop's product photos and cut-outs, atelier/ and brand/ the other site pictures.
// Inbox layout: one folder per product with 1–3 photos and an optional info.txt (name/maker/price/notes/focus: …).
// focus picks one ring when the photo shows several, e.g. "focus: only the left ring with the green inlay".
import nextEnv from '@next/env';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  CUTOUT_SHOT,
  KEEP_IDENTICAL,
  SHOTS,
  STUDIO_LOOK,
  STYLE_REFERENCE_NOTE,
} from '../lib/studio/prompts.mjs';
import { draftText, editImage } from '../lib/studio/openai.mjs';

nextEnv.loadEnvConfig(process.cwd(), false, { info() {}, error: console.error });

const slugify = (text) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const SHOP_NAME = process.env.APP_NAME || 'Shop';
const STUDIO_DIR = process.env.STUDIO_DIR || path.join(os.homedir(), `${slugify(SHOP_NAME)}-studio`);
const INBOX = path.join(STUDIO_DIR, 'inbox');
const OUT = path.join(STUDIO_DIR, 'out');
// Without a Drive remote (an rclone remote like "gdrive:myshop") everything stays in STUDIO_DIR.
const DRIVE_REMOTE = process.env.STUDIO_DRIVE_REMOTE;
const DEFAULT_PRICE = '70.00';
const STYLE_IMAGE = process.env.STUDIO_STYLE_IMAGE || path.join(STUDIO_DIR, 'style.png');
const PHOTO_EXTENSIONS = /\.(jpe?g|png|webp|heic)$/i;
const SHOP_PHOTOS = path.join('public', 'brand', 'products');
const CUTOUT_SHOTS = path.join(STUDIO_DIR, 'cutouts');
const CUTOUT_LIST = path.join('brand', 'cutouts.json');
const WORKSHOP_FILE = path.join('brand', 'workshop.json');
const CUTOUT_SIZE = 900;
// Pixels below this alpha count as background when looking for the ring.
const MIN_ALPHA = 40;

// ---------- helpers ----------

const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'));
const writeJson = (file, data) => writeFileSync(file, JSON.stringify(data, null, 2) + '\n');

// The workshop section's own pictures under public/ (full URLs live elsewhere).
const WORKSHOP_IMAGES = existsSync(WORKSHOP_FILE)
  ? Object.values(readJson(WORKSHOP_FILE)).flat().filter((image) => image.startsWith('/'))
  : [];
const productFile = (id) => path.join(OUT, id, 'product.json');

function listInboxProducts() {
  if (!existsSync(INBOX)) throw new Error(`No inbox at ${INBOX}. Run "pull" or create it.`);
  return readdirSync(INBOX, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function readInfo(dir) {
  const file = path.join(dir, 'info.txt');
  if (!existsSync(file)) return {};
  const info = {};
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const match = line.match(/^\s*(name|maker|price|notes|focus)\s*:\s*(.+)$/i);
    if (match) info[match[1].toLowerCase()] = match[2].trim();
  }
  return info;
}

async function toJpeg(input, size) {
  const { default: sharp } = await import('sharp');
  // rotate() applies the EXIF orientation of phone photos before they reach the model.
  return sharp(input).rotate().resize(size, size, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 88 }).toBuffer();
}

async function loadSourcePhotos(dir) {
  const files = readdirSync(dir).filter((file) => PHOTO_EXTENSIONS.test(file)).sort().slice(0, 3);
  if (files.length === 0) throw new Error(`No photos in ${dir}`);
  return Promise.all(files.map((file) => toJpeg(path.join(dir, file), 1536)));
}

// ---------- OpenAI ----------

let styleImage;
async function loadStyleImage() {
  if (styleImage === undefined) styleImage = existsSync(STYLE_IMAGE) ? await toJpeg(STYLE_IMAGE, 1024) : null;
  return styleImage;
}

async function generateShot(shot, references, focus) {
  const style = await loadStyleImage();
  const prompt =
    (focus ? `The photo shows several rings: ${focus}. Show only that single ring. ` : '') +
    SHOTS[shot] + KEEP_IDENTICAL + ' ' + STUDIO_LOOK + (style ? ' ' + STYLE_REFERENCE_NOTE : '');
  // 3:4 portrait, the shape of the shop's ring cards.
  const image = await editImage(prompt, [...references, ...(style ? [style] : [])], { size: '1152x1536' });
  return toJpeg(image, 2048);
}

async function generateCutoutShot(reference) {
  return editImage(CUTOUT_SHOT, [reference], { size: '1024x1024', background: 'transparent', output_format: 'png' });
}

// ---------- commands ----------

async function generateProduct(id, { force = false } = {}) {
  const dir = path.join(INBOX, id);
  const outDir = path.join(OUT, id);
  if (existsSync(productFile(id)) && !force) return console.log(`· ${id}: already done (use --force)`);
  mkdirSync(outDir, { recursive: true });

  const info = readInfo(dir);
  const sources = await loadSourcePhotos(dir);
  const hero = await generateShot('hero', sources, info.focus);
  writeFileSync(path.join(outDir, 'hero.jpg'), hero);

  // Angles use the clean hero as first reference so all images show the same ring.
  const images = ['hero.jpg'];
  for (const shot of ['side', 'top']) {
    writeFileSync(path.join(outDir, `${shot}.jpg`), await generateShot(shot, [hero, ...sources], info.focus));
    images.push(`${shot}.jpg`);
  }

  const text = await draftText(sources[0], info.notes);
  const name = info.name || text.name;
  writeJson(productFile(id), {
    id,
    name,
    slug: slugify(name),
    description: text.description,
    price: info.price ? Number(info.price.replace(',', '.')).toFixed(2) : DEFAULT_PRICE,
    brand: info.maker || SHOP_NAME,
    images,
    uploaded: [],
  });
  console.log(`✓ ${id}: ${name}`);
  syncRing(id);
}

async function generate(args) {
  const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;
  const ids = only ? [only] : listInboxProducts();
  for (const id of ids) {
    try {
      await generateProduct(id, { force: args.includes('--force') });
    } catch (error) {
      console.error(`✗ ${id}: ${error.message}`);
    }
  }
}

async function regenerate([id, shot]) {
  if (!shot) return generateProduct(id, { force: true });
  const product = readJson(productFile(id));
  const sources = await loadSourcePhotos(path.join(INBOX, id));
  const outDir = path.join(OUT, id);
  const references = shot === 'hero' ? sources : [readFileSync(path.join(outDir, 'hero.jpg')), ...sources];
  writeFileSync(path.join(outDir, `${shot}.jpg`), await generateShot(shot, references, readInfo(path.join(INBOX, id)).focus));
  if (!product.images.includes(`${shot}.jpg`)) product.images.push(`${shot}.jpg`);
  product.uploaded = [];
  writeJson(productFile(id), product);
  console.log(`✓ ${id}: ${shot} regenerated`);
  syncRing(id);
}

function reject([id, shot]) {
  if (shot === 'hero') throw new Error('The hero image cannot be rejected; regenerate it instead.');
  const product = readJson(productFile(id));
  product.images = product.images.filter((image) => image !== `${shot}.jpg`);
  product.uploaded = [];
  writeJson(productFile(id), product);
  console.log(`✓ ${id}: ${shot} removed`);
  syncRing(id);
}

function listProducts() {
  if (!existsSync(OUT)) return [];
  return readdirSync(OUT)
    .filter((id) => existsSync(productFile(id)))
    .sort()
    .map((id) => readJson(productFile(id)));
}

const escapeHtml = (text) =>
  String(text).replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char]);

function review() {
  const cards = listProducts()
    .map((product) => {
      const originals = readdirSync(path.join(INBOX, product.id))
        .filter((file) => PHOTO_EXTENSIONS.test(file))
        .map((file) => `<figure><img src="inbox/${product.id}/${file}"><figcaption>original</figcaption></figure>`)
        .join('');
      const generated = product.images
        .map((image) => `<figure><img src="out/${product.id}/${image}"><figcaption>${image}</figcaption></figure>`)
        .join('');
      return `<section><h2>${escapeHtml(product.name)} <small>${product.id} · ${product.brand} · €${product.price}</small></h2>
<p>${escapeHtml(product.description)}</p><div class="row">${originals}${generated}</div></section>`;
    })
    .join('\n');
  const html = `<!doctype html><meta charset="utf-8"><title>${escapeHtml(SHOP_NAME)} studio review</title>
<style>body{background:#0d1517;color:#eef3f2;font:15px system-ui;margin:24px}section{border-bottom:1px solid #24343a;padding:16px 0}
h2{font-weight:500}small{color:#93a7a7;font-weight:400}.row{display:flex;gap:12px;flex-wrap:wrap}
figure{margin:0}img{width:220px;height:220px;object-fit:cover;border-radius:10px}figcaption{color:#93a7a7;font-size:12px}</style>
<h1>${escapeHtml(SHOP_NAME)} studio review</h1>${cards}`;
  const file = path.join(STUDIO_DIR, 'review.html');
  writeFileSync(file, html);
  console.log(`✓ ${file}`);
}

async function upload() {
  if (!process.env.UPLOADTHING_TOKEN) throw new Error('UPLOADTHING_TOKEN is missing in .env');
  const { UTApi, UTFile } = await import('uploadthing/server');
  const utapi = new UTApi({ token: process.env.UPLOADTHING_TOKEN });
  for (const product of listProducts()) {
    if (product.uploaded.length === product.images.length) continue;
    const files = product.images.map(
      (image) => new UTFile([readFileSync(path.join(OUT, product.id, image))], `${product.slug}-${image}`)
    );
    const results = await utapi.uploadFiles(files);
    const failed = results.find((result) => result.error);
    if (failed) {
      console.error(`✗ ${product.id}: ${failed.error.message}`);
      continue;
    }
    product.uploaded = results.map((result) => result.data.ufsUrl ?? result.data.url);
    writeJson(productFile(product.id), product);
    console.log(`✓ ${product.id}: ${product.uploaded.length} images`);
  }
}

// Loose leftovers (specks, halo fragments) are separate islands of pixels: keep only the biggest one.
async function keepLargestPiece(png) {
  const { default: sharp } = await import('sharp');
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const pixelCount = width * height;
  const isSolid = (pixel) => data[pixel * 4 + 3] >= MIN_ALPHA;
  const pieceOf = new Int32Array(pixelCount);
  const pieceSizes = [0];
  const stack = [];
  for (let start = 0; start < pixelCount; start++) {
    if (pieceOf[start] || !isSolid(start)) continue;
    const piece = pieceSizes.length;
    let size = 0;
    pieceOf[start] = piece;
    stack.push(start);
    while (stack.length) {
      const pixel = stack.pop();
      const x = pixel % width;
      size++;
      for (const next of [x > 0 ? pixel - 1 : -1, x < width - 1 ? pixel + 1 : -1, pixel - width, pixel + width]) {
        if (next < 0 || next >= pixelCount || pieceOf[next] || !isSolid(next)) continue;
        pieceOf[next] = piece;
        stack.push(next);
      }
    }
    pieceSizes.push(size);
  }
  // No spread: a photo has more pieces than a call takes arguments.
  const biggest = pieceSizes.reduce((best, size, piece) => (size > pieceSizes[best] ? piece : best), 0);
  for (let pixel = 0; pixel < pixelCount; pixel++) if (pieceOf[pixel] !== biggest) data[pixel * 4 + 3] = 0;
  return sharp(data, { raw: { width, height, channels: 4 } }).png().toBuffer();
}

async function cutOut(shot) {
  const { default: sharp } = await import('sharp');
  const { channels } = await sharp(shot).stats();
  // A fully opaque picture means the model ignored the transparent background.
  if (channels.length < 4 || channels[3].min > MIN_ALPHA) throw new Error('The shot has no transparent background');
  return sharp(await keepLargestPiece(shot))
    .trim({ threshold: 8 })
    .resize(CUTOUT_SIZE, CUTOUT_SIZE, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 88, alphaQuality: 90 })
    .toBuffer();
}

function addToCutoutList(slug) {
  const slugs = existsSync(CUTOUT_LIST) ? readJson(CUTOUT_LIST) : [];
  writeJson(CUTOUT_LIST, [...new Set([...slugs, slug])].sort());
}

async function cutoutProduct(slug, { force = false } = {}) {
  const shotFile = path.join(CUTOUT_SHOTS, `${slug}.png`);
  if (!existsSync(shotFile) || force) {
    writeFileSync(shotFile, await generateCutoutShot(await toJpeg(path.join(SHOP_PHOTOS, `${slug}.jpg`), 1536)));
  }
  writeFileSync(path.join(SHOP_PHOTOS, 'cutout', `${slug}.webp`), await cutOut(readFileSync(shotFile)));
  addToCutoutList(slug);
  console.log(`✓ ${slug}`);
}

async function cutouts(args) {
  const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;
  const slugs = only
    ? [only]
    : readdirSync(SHOP_PHOTOS).filter((file) => file.endsWith('.jpg')).map((file) => file.slice(0, -4)).sort();
  mkdirSync(CUTOUT_SHOTS, { recursive: true });
  mkdirSync(path.join(SHOP_PHOTOS, 'cutout'), { recursive: true });
  for (const slug of slugs) {
    try {
      await cutoutProduct(slug, { force: args.includes('--force') });
    } catch (error) {
      console.error(`✗ ${slug}: ${error.message}`);
    }
  }
  trySync('cut-outs', pushShopPictures);
}

// ---------- Google Drive ----------

// `copy` only adds and updates, so nothing on Drive is ever deleted from here.
function rclone(from, to, ...filters) {
  if (!DRIVE_REMOTE) return;
  if (existsSync(from) || from.startsWith(DRIVE_REMOTE)) execFileSync('rclone', ['copy', from, to, ...filters], { stdio: 'inherit' });
}

// One complete folder per ring: the raw photos, the generated views, extra detail shots and the product data.
function pushRing(id) {
  const ring = `${DRIVE_REMOTE}/rings/${id}`;
  const outDir = path.join(OUT, id);
  rclone(path.join(INBOX, id), `${ring}/original`);
  rclone(outDir, `${ring}/views`, '--include', '/*.jpg');
  rclone(path.join(outDir, 'details'), `${ring}/details`);
  rclone(outDir, ring, '--include', '/product.json');
}

function pushShopPictures() {
  rclone(SHOP_PHOTOS, `${DRIVE_REMOTE}/shop/photos`, '--include', '/*.jpg');
  rclone(path.join(SHOP_PHOTOS, 'cutout'), `${DRIVE_REMOTE}/shop/cutouts`);
  rclone(CUTOUT_SHOTS, `${DRIVE_REMOTE}/shop/cutouts/raw`);
}

// A failed Drive copy must not lose a finished generation; `push` catches up later.
function trySync(label, sync) {
  try {
    sync();
  } catch (error) {
    console.error(`! ${label}: not synced to Drive, run "npm run studio -- push" (${error.message.split('\n')[0]})`);
  }
}

const syncRing = (id) => trySync(id, () => pushRing(id));

function push() {
  for (const id of existsSync(OUT) ? readdirSync(OUT).sort() : []) pushRing(id);
  pushShopPictures();
  for (const image of WORKSHOP_IMAGES) rclone(path.join('public', image), `${DRIVE_REMOTE}/atelier`);
  rclone(path.join('public', 'brand'), `${DRIVE_REMOTE}/brand`, '--include', '/*.{png,jpg,svg,webp}');
}

const COMMANDS = {
  pull: () => rclone(`${DRIVE_REMOTE}/inbox`, INBOX),
  push,
  generate,
  regenerate,
  reject,
  review,
  upload,
  cutouts,
};

const [command, ...args] = process.argv.slice(2);
if (!COMMANDS[command]) {
  console.error(`Usage: npm run studio -- <${Object.keys(COMMANDS).join('|')}>`);
  process.exit(1);
}
await COMMANDS[command](args);
