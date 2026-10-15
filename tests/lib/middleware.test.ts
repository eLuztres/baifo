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
});
