import { NextRequest, NextResponse } from 'next/server';
import { middleware } from '@/middleware';

// Better Auth ships ESM only; the middleware just needs "is there a session cookie".
jest.mock('better-auth/cookies', () => ({
  getSessionCookie: (req: NextRequest) => req.cookies.get('better-auth.session_token')?.value ?? null,
}));

function request(path: string, { method = 'GET', cartCookie = true, signedIn = false } = {}) {
  const req = new NextRequest(`http://localhost:3000${path}`, { method });
  if (cartCookie) req.cookies.set('sessionCartId', 'cart-1');
  if (signedIn) req.cookies.set('better-auth.session_token', 'token.signature');
  return req;
}

const isSignInRedirect = (res: NextResponse) => res.headers.get('location')?.includes('/sign-in') ?? false;

describe('middleware', () => {
  it.each([
    '/shipping-address',
    '/payment-method',
    '/place-order',
    '/user/profile',
    '/user/orders',
    '/order/abc',
    '/admin/overview',
  ])('sends guests on %s to sign-in', (path) => {
    const res = middleware(request(path));

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe(`http://localhost:3000/sign-in?callbackUrl=${encodeURIComponent(path)}`);
  });

  it.each(['/', '/store', '/cart', '/product/lamp', '/sign-in'])('lets guests view %s', (path) => {
    expect(isSignInRedirect(middleware(request(path)))).toBe(false);
  });

  it('keeps the query string in the callback URL', () => {
    const res = middleware(request('/order/abc?paid=1'));

    expect(res.headers.get('location')).toBe(
      `http://localhost:3000/sign-in?callbackUrl=${encodeURIComponent('/order/abc?paid=1')}`
    );
  });

  it.each(['/users', '/orders-info'])('does not protect look-alike path %s', (path) => {
    expect(isSignInRedirect(middleware(request(path)))).toBe(false);
  });

  it('lets signed-in users through protected pages', () => {
    expect(isSignInRedirect(middleware(request('/place-order', { signedIn: true })))).toBe(false);
  });

  it('redirects guest POSTs to sign-in with a 303 and callback URL', () => {
    const res = middleware(request('/place-order', { method: 'POST' }));

    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toBe('http://localhost:3000/sign-in?callbackUrl=%2Fplace-order');
  });

  it('gives new visitors a session cart cookie', () => {
    const res = middleware(request('/', { cartCookie: false }));

    expect(res.cookies.get('sessionCartId')?.value).toMatch(/^[0-9a-f-]{36}$/);
  });

  // NextResponse.next({ request: { headers } }) hands overridden request headers on with this prefix.
  it('passes the language from ?lang= on to the page', () => {
    const res = middleware(request('/product/lamp?lang=en'));

    expect(res.headers.get('x-middleware-request-x-url-locale')).toBe('en');
  });

  it('ignores a language header sent by the visitor', () => {
    const req = request('/');
    req.headers.set('x-url-locale', 'de');

    expect(middleware(req).headers.get('x-middleware-request-x-url-locale')).toBeNull();
  });

  describe('with PREVIEW_PASSWORD', () => {
    const withAuth = (value: string) => {
      const req = request('/');
      req.headers.set('authorization', value);
      return req;
    };

    beforeEach(() => {
      process.env.PREVIEW_PASSWORD = 'baifo:preview';
    });
    afterEach(() => {
      delete process.env.PREVIEW_PASSWORD;
    });

    it('asks for the password', () => {
      const res = middleware(request('/'));

      expect(res.status).toBe(401);
      expect(res.headers.get('www-authenticate')).toContain('Basic');
    });

    it('turns a wrong password away', () => {
      expect(middleware(withAuth(`Basic ${btoa('joe:wrong')}`)).status).toBe(401);
    });

    it('turns a broken or non-Basic header away instead of crashing', () => {
      expect(middleware(withAuth('Basic %%%not-base64')).status).toBe(401);
      expect(middleware(withAuth(`Bearer ${btoa('joe:baifo:preview')}`)).status).toBe(401);
    });

    it('lets the right password in, with any user name', () => {
      expect(middleware(withAuth(`Basic ${btoa('joe:baifo:preview')}`)).status).toBe(200);
    });
  });
});
