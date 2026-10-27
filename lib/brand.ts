/**
 * Everything that makes a shop look like one customer's shop.
 * Values come from the environment (see `.env.example`), so every customer
 * runs the same code and only differs in `.env`, `public/brand/` and `brand/`.
 * Server-only: these env vars are read at request time, not inlined in client code.
 */

import workshop from '@/brand/workshop.json';
import adminLinks from '@/brand/admin-links.json';
import ringFigures from '@/brand/ring-figures.json';
import ringFlyers from '@/brand/ring-flyers.json';

export type ThemeMode = 'light' | 'dark' | 'system';

const env = (key: string) => process.env[key]?.trim() || undefined;

export interface Point {
  x: number;
  y: number;
}

// "x,y" as shares of a picture's width and height, e.g. "0.9,0.7".
function readPoint(key: string): Point | undefined {
  const [x, y] = (env(key) ?? '').split(',').map(Number);
  return Number.isFinite(x) && Number.isFinite(y) && env(key) ? { x, y } : undefined;
}

// Only plain color/length values may be injected into the page's <style> tag.
const SAFE_CSS_VALUE = /^[#\w\s.,%()/-]+$/;

// Matches the variables defined in assets/styles/globals.css.
const COLOR_TOKENS = [
  'background',
  'foreground',
  'card',
  'card-foreground',
  'popover',
  'popover-foreground',
  'primary',
  'primary-foreground',
  'secondary',
  'secondary-foreground',
  'muted',
  'muted-foreground',
  'accent',
  'accent-foreground',
  'destructive',
  'destructive-foreground',
  'border',
  'input',
  'ring',
  'chart-1',
  'chart-2',
  'chart-3',
  'chart-4',
  'chart-5',
  'inlay',
  'inlay-top',
] as const;

type ColorToken = (typeof COLOR_TOKENS)[number];

const DEFAULT_PRIMARY = '#4F46E5';

// .env treats an unquoted `#` as a comment, so bare hex like 4F46E5 is accepted too.
const withHash = (value?: string) => (value && /^[0-9a-f]{3,8}$/i.test(value) ? `#${value}` : value);

function readColors(prefix: string) {
  const colors: Partial<Record<ColorToken, string>> = {};
  for (const token of COLOR_TOKENS) {
    const value = withHash(env(`${prefix}${token.toUpperCase().replace(/-/g, '_')}`));
    if (value && SAFE_CSS_VALUE.test(value)) colors[token] = value;
  }
  return colors;
}

function readTheme(): ThemeMode {
  const theme = env('BRAND_THEME');
  return theme === 'dark' || theme === 'system' ? theme : 'light';
}

function socialUrl(base: string, account?: string) {
  return account ? `${base}${account.replace(/^@/, '')}` : undefined;
}

const instagram = env('INSTAGRAM_ACCOUNT');
const whatsapp = env('WHATSAPP_NUMBER')?.replace(/\D/g, '');

export const BRAND = {
  name: env('APP_NAME') ?? env('NEXT_PUBLIC_APP_NAME') ?? 'My Shop',
  description:
    env('APP_DESCRIPTION') ??
    env('NEXT_PUBLIC_APP_DESCRIPTION') ??
    'An online shop built on the custom shop template.',

  logo: env('BRAND_LOGO') ?? '/brand/logo.svg',
  /** The logo on dark backgrounds (dark mode); without it the normal logo shows there too. */
  logoDark: env('BRAND_LOGO_DARK'),
  /** The logo's height in the site header, in px, from tablets up (phones get three quarters); at most 72 so the header keeps its height. */
  logoHeight: Math.min(Number(env('BRAND_LOGO_HEIGHT')) || 64, 72),
  icon: env('BRAND_ICON') ?? '/brand/icon.svg',
  ogImage: env('BRAND_OG_IMAGE'),
  heroImage: env('BRAND_HERO_IMAGE'),
  showNameInHeader: env('BRAND_SHOW_NAME') !== 'false',
  /** The sign-in / "Join" button for visitors; admins of a shop without customer accounts use /sign-in directly. */
  // A "Join" button makes no sense when nobody can join without an invite link.
  showSignIn: env('BRAND_SHOW_SIGN_IN') !== 'false' && !(env('SHOWCASE_MODE') === 'true' && env('SIGN_UP_BY_INVITE') === 'true'),
  hasGoldLeafBackground: env('BRAND_DECORATION') === 'goldleaf',
  hasDunesBackground: env('BRAND_DECORATION') === 'dunes',
  loaderImage: env('BRAND_LOADER_IMAGE'),
  /** On a product page, swiping up (or the wheel down) opens the next product. */
  hasSwipeToNext: env('BRAND_SWIPE_TO_NEXT') !== 'false',
  /** On small screens, the slim row of section links that shows briefly when the page moves to another part. */
  hasNavRow: env('BRAND_NAV_ROW') !== 'false',
  /** The middle of the category ring: the gold band, nothing, or a picture shown as a turning 3D piece. */
  ringCenter: env('BRAND_RING_CENTER') ?? 'band',
  /** A picture lying flat under that piece, three times its size and centered on it (e.g. a sea around an island). */
  ringCenterSea: env('BRAND_RING_CENTER_SEA'),
  /** A small picture (e.g. a seagull) that three copies of fly in loops above that piece. */
  ringFlyer: env('BRAND_RING_FLYER'),
  /** A picture standing on that 3D piece (its foot at the bottom middle), with an optional part turning about its middle. */
  ringFigure: env('BRAND_RING_FIGURE'),
  ringFigureSpinner: env('BRAND_RING_FIGURE_SPINNER'),
  ringFigureAt: readPoint('BRAND_RING_FIGURE_AT') ?? { x: 0.5, y: 0.5 },
  /** A picture (e.g. the logo) instead of the drawn genie lamp; its bottom edge must be the lamp's foot. */
  lampImage: env('BRAND_LAMP_IMAGE'),
  lampSpout: readPoint('BRAND_LAMP_SPOUT'),

  theme: readTheme(),
  colors: readColors('BRAND_COLOR_'),
  darkColors: readColors('BRAND_DARK_COLOR_'),
  radius: env('BRAND_RADIUS'),
  displayFontUrl: env('BRAND_FONT_DISPLAY_URL'),

  contact: {
    email: env('CONTACT_EMAIL'),
    // Without CONTACT_PHONE the WhatsApp number itself is shown.
    phone: env('CONTACT_PHONE') ?? (whatsapp ? `+${whatsapp}` : undefined),
    whatsappUrl: whatsapp ? `https://wa.me/${whatsapp}` : undefined,
    /** The "sell" links and QR code: the chat opens with the message already typed, in the visitor's language. */
    sellWhatsappUrl: (message: string) => (whatsapp ? `https://wa.me/${whatsapp}?text=${encodeURIComponent(message)}` : undefined),
    instagram,
    instagramUrl: socialUrl('https://www.instagram.com/', instagram),
    // Whether the website shows each one; the email still sends and receives the shop's mail when hidden.
    showEmail: env('SHOW_CONTACT_EMAIL') !== 'false',
    showPhone: env('SHOW_CONTACT_PHONE') !== 'false',
    showInstagram: env('SHOW_CONTACT_INSTAGRAM') !== 'false',
  },
};

export const hasContactInfo = Boolean(
  BRAND.contact.email || BRAND.contact.phone || BRAND.contact.instagram
);

/** The workshop section's pictures from brand/workshop.json: up to three step photos and a gallery. */
export const WORKSHOP: { steps: string[]; gallery: string[] } = workshop;

export const hasWorkshop = WORKSHOP.steps.length > 0 || WORKSHOP.gallery.length > 0;

/** The shop's own admin pages for the admin menu (brand/admin-links.json), with a label per language. */
export const ADMIN_LINKS: { href: string; label: Record<string, string> }[] = adminLinks;


/** More pictures standing on the ring's center piece (brand/ring-figures.json), next to BRAND_RING_FIGURE. */
export const RING_FIGURES: { image: string; spinner?: string; at: { x: number; y: number }; scale?: number; drift?: boolean }[] = ringFigures;

/** The flyers above the ring's center piece (brand/ring-flyers.json), e.g. gulls with their own wing beats; else BRAND_RING_FLYER. */
export const RING_FLYERS: string[] = ringFlyers.length > 0 ? ringFlyers : BRAND.ringFlyer ? [BRAND.ringFlyer] : [];

/** Emails can't use CSS variables, so they get plain colors (use hex values in .env). */
export const EMAIL_COLORS = {
  primary: BRAND.colors.primary ?? DEFAULT_PRIMARY,
  primaryForeground: BRAND.colors['primary-foreground'] ?? '#FFFFFF',
  // Same background as the site header, so the logo sits on the color it was made for.
  header: BRAND.colors.background ?? (BRAND.theme === 'dark' ? '#0B0B0F' : '#FFFFFF'),
};

/** Relative asset paths need the site URL in emails and Open Graph tags. */
export function absoluteUrl(path: string, serverUrl: string) {
  return /^https?:\/\//.test(path) ? path : `${serverUrl}${path}`;
}

// The URL lands inside url('') in a <style> tag, so only a site path or a clean https URL is allowed.
function isSafeFontUrl(url: string) {
  if (/^\/(?!\/)[\w./-]+$/.test(url)) return true;
  if (/[\s<>"'()\\;]/.test(url)) return false;
  try {
    return new URL(url).protocol === 'https:';
  } catch {
    return false;
  }
}

function cssVars(colors: Partial<Record<ColorToken, string>>) {
  return Object.entries(colors)
    .map(([token, value]) => `--${token}: ${value};`)
    .join(' ');
}

/** CSS that layers the customer's env settings over the defaults in globals.css. */
export function getBrandCss() {
  const rules: string[] = [];
  const radius = BRAND.radius && SAFE_CSS_VALUE.test(BRAND.radius) ? `--radius: ${BRAND.radius};` : '';

  // Unlayered, so it wins over globals.css; `.dark` comes last to override `:root` in dark mode.
  const rootVars = `${cssVars(BRAND.colors)} ${radius}`.trim();
  if (rootVars) rules.push(`:root, .dark { ${rootVars} }`);
  const darkVars = cssVars(BRAND.darkColors);
  if (darkVars) rules.push(`.dark { ${darkVars} }`);

  if (BRAND.displayFontUrl && isSafeFontUrl(BRAND.displayFontUrl)) {
    rules.push(
      // The weight range lets a variable font draw every weight itself instead of the browser faking bold.
      `@font-face { font-family: 'BrandDisplay'; src: url('${BRAND.displayFontUrl}'); font-weight: 100 900; font-display: swap; }`,
      `:root { --brand-font-display: 'BrandDisplay'; }`
    );
  }

  return rules.join('\n');
}
