// Builds the Baifo sticker files from goat.svg and goat-logo.svg (the hand-drawn vector logo).
// Run: node brand/print/stickers/build.mjs   (CHROME_PATH=… if Playwright's own Chromium is missing)
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { chromium } from 'playwright';

const DIR = dirname(fileURLToPath(import.meta.url));
const OUT = join(DIR, 'files');
const DPI = 300;

const INK = '#1C262D';
const CREAM = '#FBF6EE';
const WHITE = '#FFFFFF';

const readArt = (file) => {
  const svg = readFileSync(join(DIR, file), 'utf8');
  return svg.slice(svg.indexOf('>') + 1, svg.lastIndexOf('</svg>'));
};
const GOAT = readArt('goat.svg');
const LOGO = readArt('goat-logo.svg');
// Art bounds inside goat.svg (the sun pokes out past 800 on the right)
const GOAT_BOX = { x: 5, y: 4, width: 796, height: 930 };
// Covers the open face so the die-cut sticker has no see-through gaps
const GOAT_FACE = 'M278 342 L250 700 L200 790 L450 820 L580 708 L684 660 L728 610 L700 500 L600 300 L400 178 L250 230 Z';
const LOGO_BOX = { x: 0, y: 0, width: 902, height: 320 };

// Dark stickers: cream lines, the eye highlight turns into the background
const onDark = (art) => art.replaceAll(INK, CREAM).replaceAll(WHITE, INK);
const mono = (art) => art.replace(/#(E27355|10969A)/g, INK);

const svgDoc = (widthMm, heightMm, viewBox, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${widthMm}mm" height="${heightMm}mm" viewBox="${viewBox}">\n${body}\n</svg>\n`;

// Places art (with bounds `box`) centered and scaled into a w×h area at (x, y)
const fit = (art, box, x, y, w, h) => {
  const scale = Math.min(w / box.width, h / box.height);
  const dx = x + (w - box.width * scale) / 2 - box.x * scale;
  const dy = y + (h - box.height * scale) / 2 - box.y * scale;
  return `<g transform="translate(${dx.toFixed(2)} ${dy.toFixed(2)}) scale(${scale.toFixed(5)})">${art}</g>`;
};

// Round sticker, 1 unit = 0.1 mm
const roundSticker = (diameterMm, isDark) => {
  const d = diameterMm * 10;
  const art = isDark ? onDark(GOAT) : GOAT;
  const body = `<circle cx="${d / 2}" cy="${d / 2}" r="${d / 2}" fill="${isDark ? INK : WHITE}"/>\n${fit(art, GOAT_BOX, d * 0.2, d * 0.16, d * 0.6, d * 0.68)}`;
  return svgDoc(diameterMm, diameterMm, `0 0 ${d} ${d}`, body);
};

// Rounded-rectangle sticker with the goat + "baifo" wordmark, 1 unit = 0.1 mm
const logoSticker = (widthMm, heightMm, isDark) => {
  const [w, h, pad] = [widthMm * 10, heightMm * 10, 40];
  const art = isDark ? onDark(LOGO) : LOGO;
  const body = `<rect width="${w}" height="${h}" rx="40" fill="${isDark ? INK : WHITE}"/>\n${fit(art, LOGO_BOX, pad, pad, w - 2 * pad, h - 2 * pad)}`;
  return svgDoc(widthMm, heightMm, `0 0 ${w} ${h}`, body);
};

// Die-cut goat: the art again underneath with a thick white outline, transparent around it.
// Print shops trace their cut line from that white edge.
const dieCutSticker = (heightMm, borderMm) => {
  const unitsPerMm = GOAT_BOX.height / (heightMm - 2 * borderMm);
  const border = borderMm * unitsPerMm;
  const outline = GOAT
    .replace(/stroke-width="(\d+)"/g, (_, w) => `stroke-width="${+w + 2 * border}"`)
    .replace(/(fill|stroke)="#[0-9A-F]{6}"/g, `$1="${WHITE}"`)
    .replace(/fill="none"/g, `fill="${WHITE}"`);
  const [x, y] = [GOAT_BOX.x - border, GOAT_BOX.y - border];
  const [w, h] = [GOAT_BOX.width + 2 * border, GOAT_BOX.height + 2 * border];
  const widthMm = +(w / unitsPerMm).toFixed(1);
  return svgDoc(widthMm, heightMm, `${x} ${y} ${w} ${h}`, `<g stroke="${WHITE}" stroke-width="${2 * border}" stroke-linejoin="round" fill="${WHITE}"><path d="${GOAT_FACE}"/>${outline}</g>\n${GOAT}`);
};

// A4 sheet to print at home on sticker paper, with light grey cut guides
const a4Sheet = () => {
  const guide = `fill="none" stroke="#BBBBBB" stroke-width="2"`;
  const parts = [];
  const place = (svg, xMm, yMm, wMm, hMm, cut) => {
    const inner = svg.slice(svg.indexOf('>') + 1, svg.lastIndexOf('</svg>'));
    const viewBox = svg.match(/viewBox="([^"]+)"/)[1];
    parts.push(`<svg x="${xMm * 10}" y="${yMm * 10}" width="${wMm * 10}" height="${hMm * 10}" viewBox="${viewBox}">${inner}</svg>`, cut(xMm * 10, yMm * 10, wMm * 10, hMm * 10));
  };
  const circleCut = (x, y, w) => `<circle cx="${x + w / 2}" cy="${y + w / 2}" r="${w / 2}" ${guide}/>`;
  const rectCut = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="40" ${guide}/>`;
  for (const [row, isDark] of [[0, false], [1, false], [2, true]]) {
    for (const col of [0, 1, 2]) place(roundSticker(50, isDark), 22.5 + col * 57.5, 15 + row * 57.5, 50, 50, circleCut);
  }
  for (const [row, isDark] of [[0, false], [1, true]]) {
    for (const col of [0, 1]) place(logoSticker(80, 30, isDark), 20 + col * 90, 195 + row * 40, 80, 30, rectCut);
  }
  return svgDoc(210, 297, '0 0 2100 2970', `<rect width="2100" height="2970" fill="${WHITE}"/>\n${parts.join('\n')}`);
};

const sizeMm = (svg) => svg.match(/width="([\d.]+)mm" height="([\d.]+)mm"/).slice(1).map(Number);

const writePng = (svg, file) =>
  sharp(Buffer.from(svg), { density: DPI })
    .resize(Math.round((sizeMm(svg)[0] / 25.4) * DPI))
    .withMetadata({ density: DPI })
    .png()
    .toFile(join(OUT, file));

const writePdf = async (page, svg, file) => {
  const [w, h] = sizeMm(svg);
  await page.setContent(`<style>@page{margin:0}html,body{margin:0}svg{display:block}</style>${svg}`);
  await page.pdf({ path: join(OUT, file), width: `${w}mm`, height: `${h}mm`, printBackground: true, pageRanges: '1' });
};

const STICKERS = {
  'goat-mono.svg': svgDoc(80, 94.7, '0 0 800 947', mono(GOAT)),
  'sticker-round-50mm.svg': roundSticker(50, false),
  'sticker-round-50mm-dark.svg': roundSticker(50, true),
  'sticker-logo-80x30mm.svg': logoSticker(80, 30, false),
  'sticker-logo-80x30mm-dark.svg': logoSticker(80, 30, true),
  'sticker-diecut-50mm.svg': dieCutSticker(50, 3.5),
  'sheet-a4.svg': a4Sheet(),
};
const PDFS = ['sticker-round-50mm', 'sticker-round-50mm-dark', 'sticker-logo-80x30mm', 'sticker-logo-80x30mm-dark', 'sheet-a4'];

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH });
const page = await browser.newPage();
for (const [file, svg] of Object.entries(STICKERS)) {
  writeFileSync(join(OUT, file), svg);
  await writePng(svg, file.replace('.svg', '.png'));
  const name = file.replace('.svg', '');
  if (PDFS.includes(name)) await writePdf(page, svg, `${name}.pdf`);
}
await browser.close();
console.log(`Sticker files written to ${OUT}`);
