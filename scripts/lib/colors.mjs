// Color helpers for the shop wizard: hex math, readable text colors and a palette from an image.

export function normalizeHex(value) {
  if (!value) return undefined;
  const hex = String(value).trim().replace(/^#/, '');
  if (!/^([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex)) return undefined;
  const full = hex.length === 3 ? [...hex].map((c) => c + c).join('') : hex;
  return `#${full.toUpperCase()}`;
}

const toRgb = (hex) => {
  const n = parseInt(normalizeHex(hex).slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const toHex = (rgb) =>
  `#${rgb.map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, '0')).join('').toUpperCase()}`;

export function luminance(hex) {
  const [r, g, b] = toRgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** White or near-black, whichever reads better on `background`. */
export function readableOn(background) {
  return contrast(background, '#FFFFFF') >= contrast(background, '#18181B') ? '#FFFFFF' : '#18181B';
}

/** Mix `hex` toward `target` by `amount` (0–1). */
export function mix(hex, target, amount) {
  const a = toRgb(hex);
  const b = toRgb(target);
  return toHex(a.map((c, i) => c + (b[i] - c) * amount));
}

function saturation([r, g, b]) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max === 0 ? 0 : (max - min) / max;
}

/**
 * The full set of BRAND_COLOR_* tokens from one primary color and a theme,
 * so a shop looks consistent even when only the primary is chosen.
 */
export function paletteFromPrimary(primaryHex, theme = 'light', backgroundHex) {
  const primary = normalizeHex(primaryHex);
  const isDark = theme === 'dark';
  const background = normalizeHex(backgroundHex) ?? (isDark ? mix(primary, '#000000', 0.9) : '#FFFFFF');
  const foreground = readableOn(background);
  const surface = isDark ? mix(background, '#FFFFFF', 0.05) : mix(primary, '#FFFFFF', 0.95);

  return {
    primary,
    'primary-foreground': readableOn(primary),
    accent: primary,
    'accent-foreground': readableOn(primary),
    ring: primary,
    background,
    foreground,
    card: isDark ? mix(background, '#FFFFFF', 0.04) : '#FFFFFF',
    'card-foreground': foreground,
    popover: isDark ? mix(background, '#FFFFFF', 0.04) : '#FFFFFF',
    'popover-foreground': foreground,
    muted: surface,
    'muted-foreground': mix(foreground, background, 0.4),
    secondary: surface,
    'secondary-foreground': foreground,
    border: mix(background, foreground, isDark ? 0.15 : 0.12),
    input: mix(background, foreground, isDark ? 0.15 : 0.12),
  };
}

/**
 * Dominant colors of an image (a logo or an Instagram profile picture).
 * Returns swatches sorted by how "brand-like" they are, plus a suggested primary and theme.
 */
export async function paletteFromImage(file) {
  const { default: sharp } = await import('sharp');
  const { data, info } = await sharp(file)
    .resize(128, 128, { fit: 'inside' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const buckets = new Map();
  let total = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    if (data[i + 3] < 128) continue; // transparent background of a logo
    const rgb = [data[i], data[i + 1], data[i + 2]];
    // 4 bits per channel groups anti-aliased and JPEG-noisy pixels into one color.
    const key = rgb.map((c) => c >> 4).join(',');
    const bucket = buckets.get(key) ?? { count: 0, sum: [0, 0, 0] };
    bucket.count += 1;
    rgb.forEach((c, j) => (bucket.sum[j] += c));
    buckets.set(key, bucket);
    total += 1;
  }

  const all = [...buckets.values()]
    .map(({ count, sum }) => {
      const rgb = sum.map((c) => c / count);
      return { hex: toHex(rgb), share: count / total, saturation: saturation(rgb) };
    })
    .sort((a, b) => b.share - a.share);

  const averageLuminance = all.reduce((acc, s) => acc + luminance(s.hex) * s.share, 0);
  // The primary should be colorful and visible, not the (often white or black) background.
  const candidates = all.filter(
    (s) => s.share > 0.003 && s.saturation > 0.35 && luminance(s.hex) > 0.08 && luminance(s.hex) < 0.75
  );
  const primary =
    candidates.sort((a, b) => b.share * b.saturation ** 2 - a.share * a.saturation ** 2)[0]?.hex ?? all[0].hex;

  return {
    primary,
    theme: averageLuminance < 0.25 ? 'dark' : 'light',
    background: all[0].hex,
    swatches: all
      .slice(0, 8)
      .concat(candidates.slice(0, 4))
      .filter((s, i, list) => list.findIndex((x) => x.hex === s.hex) === i)
      .map(({ hex, share }) => ({ hex, share: Math.round(share * 1000) / 10 })),
  };
}
