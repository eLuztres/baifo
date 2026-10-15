import { NextResponse, type NextRequest } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';

// Pages that need a signed-in user. Roles (admin) are checked on the server, not here.
const PROTECTED_PATHS = [
  /\/shipping-address/,
  /\/payment-method/,
  /\/place-order/,
  /\/profile/,
  /\/user\/(.*)/,
  /\/order\/(.*)/,
  /\/admin/,
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only checks that a session cookie exists; the pages verify it for real.
  if (!getSessionCookie(request) && PROTECTED_PATHS.some((path) => path.test(pathname))) {
    const signInUrl = new URL('/sign-in', request.nextUrl.origin);
    signInUrl.searchParams.set('callbackUrl', pathname);
    // 303 so form posts / server actions from an expired session arrive as a GET.
    return NextResponse.redirect(signInUrl, request.method === 'GET' ? 307 : 303);
  }

  // Guests get a cart id so they can shop before signing in.
  if (!request.cookies.get('sessionCartId')) {
    const response = NextResponse.next({ request: { headers: new Headers(request.headers) } });
    response.cookies.set('sessionCartId', crypto.randomUUID());
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
