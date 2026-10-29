import { NextResponse, type NextRequest } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';
import { URL_LOCALE_HEADER } from '@/lib/i18n-core';
import { buildContentSecurityPolicy } from '@/lib/security-headers';

// Pages that need a signed-in user. Roles (admin) are checked on the server, not here.
const PROTECTED_PATHS = [
  /^\/(shipping-address|payment-method|place-order)(\/|$)/,
  /^\/(user|order|admin)(\/|$)/,
];

// Showcase mode sells nothing: the cart, checkout, orders and the price search lead home.
const SHOWCASE_MODE = process.env.SHOWCASE_MODE === 'true';
const SHOP_ONLY_PATHS = /^\/(cart|search|shipping-address|payment-method|place-order|order|user\/orders)(\/|$)/;

// A private preview (PREVIEW_PASSWORD set) asks for the shared password; any user name goes.
function hasPreviewPassword(request: NextRequest, password: string) {
  const [scheme, encoded] = request.headers.get('authorization')?.split(' ') ?? [];
  if (scheme !== 'Basic' || !encoded) return false;
  try {
    const credentials = atob(encoded);
    return credentials.slice(credentials.indexOf(':') + 1) === password;
  } catch {
    return false; // not base64: a 401, not a crash
  }
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const previewPassword = process.env.PREVIEW_PASSWORD;
  if (previewPassword && !hasPreviewPassword(request, previewPassword)) {
    return new NextResponse('Password required', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="preview", charset="UTF-8"' },
    });
  }

  if (SHOWCASE_MODE && SHOP_ONLY_PATHS.test(pathname)) {
    return NextResponse.redirect(new URL('/', request.nextUrl.origin));
  }

  // Only checks that a session cookie exists; the pages verify it for real.
  if (!getSessionCookie(request) && PROTECTED_PATHS.some((path) => path.test(pathname))) {
    // A relative callbackUrl, so it survives the safeCallbackUrl check on any host.
    const signInUrl = new URL('/sign-in', request.nextUrl.origin);
    signInUrl.searchParams.set('callbackUrl', `${pathname}${search}`);
    // 303 so form posts / server actions from an expired session arrive as a GET.
    return NextResponse.redirect(signInUrl, request.method === 'GET' ? 307 : 303);
  }

  // `?lang=` reaches getLocale as a header; unknown values are ignored there.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete(URL_LOCALE_HEADER);
  const urlLocale = request.nextUrl.searchParams.get('lang');
  if (urlLocale) requestHeaders.set(URL_LOCALE_HEADER, urlLocale);

  // Next.js reads the nonce from the request's CSP header and puts it on its own scripts; the layout reads x-nonce.
  const nonce = btoa(crypto.randomUUID());
  const contentSecurityPolicy = buildContentSecurityPolicy({ nonce, isDev: process.env.NODE_ENV === 'development' });
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', contentSecurityPolicy);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', contentSecurityPolicy);

  // Guests get a cart id so they can shop before signing in.
  if (!SHOWCASE_MODE && !request.cookies.get('sessionCartId')) {
    response.cookies.set('sessionCartId', crypto.randomUUID());
  }

  return response;
}

// Pages and server-action posts only: they need the sign-in guard and the sessionCartId cookie.
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|webp|svg|ico|woff2|mp4|glb|gif)$).*)'],
};
