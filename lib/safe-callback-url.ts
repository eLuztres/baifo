import { SERVER_URL } from '@/lib/constants';

/**
 * Returns `value` as a path on this site (for the redirect after signing in),
 * or `fallback` when it is missing or points to another site.
 * Accepts relative paths and absolute URLs of this site, such as the middleware's callbackUrl.
 */
export function safeCallbackUrl(value: unknown, fallback = '/'): string {
  if (typeof value !== 'string' || !value) return fallback;

  try {
    const base = new URL(SERVER_URL);
    // Parsing like the browser does catches tricks such as '//evil.com' or '/\evil.com'.
    const url = new URL(value, base);
    if (url.origin !== base.origin || url.pathname.startsWith('//')) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
