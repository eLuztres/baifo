// The origins the browser may load from or talk to. Keep in sync with the payment, upload and map features.
const STRIPE = ['https://js.stripe.com', 'https://*.js.stripe.com'];
const PAYPAL = ['https://*.paypal.com', 'https://*.paypalobjects.com'];
const UPLOADTHING_FILES = ['https://utfs.io', 'https://*.ufs.sh'];
const UPLOADTHING_UPLOADS = ['https://uploadthing.com', 'https://*.uploadthing.com', 'https://*.ingest.uploadthing.com'];
// The map embed on a corral page.
const MAP_FRAMES = ['https://www.openstreetmap.org'];
// The Google sign-in form posts to our server action, which redirects to Google.
const SIGN_IN = ['https://accounts.google.com'];

/** Headers for every route; the Content-Security-Policy is added per page by the middleware (it needs a nonce). */
export const SECURITY_HEADERS = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  // Camera and microphone stay on for the shop itself: listing photos/videos and voice dictation.
  // PayPal's button frame asks for `payment` too (its Apple Pay / Google Pay buttons).
  {
    key: 'Permissions-Policy',
    value:
      'camera=(self), microphone=(self), geolocation=(), payment=(self "https://js.stripe.com" "https://*.paypal.com"), usb=(), interest-cohort=()',
  },
  // Popups, not isolation: PayPal's checkout window talks back to the page that opened it.
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
];

/** CSP_EXTRA_ORIGINS: space- or comma-separated origins a shop adds (e.g. another image or font host). */
function extraOrigins() {
  return (process.env.CSP_EXTRA_ORIGINS ?? '').split(/[\s,]+/).filter((origin) => /^https:\/\/[\w.*-]+(:\d+)?$/.test(origin));
}

// BRAND_FONT_DISPLAY_URL may point to a font on another host.
function displayFontOrigin() {
  const url = process.env.BRAND_FONT_DISPLAY_URL;
  if (!url?.startsWith('https://')) return [];
  try {
    return [new URL(url).origin];
  } catch {
    return [];
  }
}

interface ContentSecurityPolicyOptions {
  nonce: string;
  isDev: boolean;
}

/** The page's Content-Security-Policy: scripts only with this request's nonce (and what they load, via strict-dynamic). */
export function buildContentSecurityPolicy({ nonce, isDev }: ContentSecurityPolicyOptions) {
  const extra = extraOrigins();
  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    // Hosts after strict-dynamic only count in old browsers that ignore it; React refresh needs eval in dev.
    'script-src': ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'", ...STRIPE, ...PAYPAL, ...extra, ...(isDev ? ["'unsafe-eval'"] : [])],
    // React style attributes, the brand <style> tag and the payment widgets all use inline styles.
    'style-src': ["'self'", "'unsafe-inline'", ...extra],
    'img-src': ["'self'", 'data:', 'blob:', ...UPLOADTHING_FILES, 'https://*.stripe.com', ...PAYPAL, ...extra],
    'media-src': ["'self'", 'data:', 'blob:', ...UPLOADTHING_FILES, ...extra],
    'font-src': ["'self'", 'data:', ...displayFontOrigin(), ...extra],
    'connect-src': [
      "'self'",
      'https://api.stripe.com',
      ...PAYPAL,
      ...UPLOADTHING_FILES,
      ...UPLOADTHING_UPLOADS,
      ...extra,
      ...(isDev ? ['ws:'] : []),
    ],
    'frame-src': [...STRIPE, 'https://hooks.stripe.com', ...PAYPAL, ...MAP_FRAMES, ...extra],
    'worker-src': ["'self'", 'blob:'],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'", ...SIGN_IN, ...PAYPAL, 'https://hooks.stripe.com'],
    'frame-ancestors': ["'none'"],
  };

  const policy = Object.entries(directives).map(([name, sources]) => `${name} ${sources.join(' ')}`);
  // Dev runs on plain http://localhost.
  if (!isDev) policy.push('upgrade-insecure-requests');
  return policy.join('; ');
}
