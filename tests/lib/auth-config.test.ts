import { NextRequest, NextResponse } from 'next/server';
import { authConfig } from '@/auth.config';

const SESSION = { user: { id: 'u1' } };

function request(path: string, { method = 'GET', cartCookie = true } = {}) {
  const req = new NextRequest(`http://localhost:3000${path}`, { method });
  if (cartCookie) req.cookies.set('sessionCartId', 'cart-1');
  return req;
}

function authorized(req: NextRequest, auth: typeof SESSION | null) {
  return authConfig.callbacks.authorized({ request: req, auth });
}

describe('authConfig.callbacks.authorized', () => {
  it.each([
    '/shipping-address',
    '/payment-method',
    '/place-order',
    '/user/profile',
    '/user/orders',
    '/order/abc',
    '/admin/overview',
  ])('blocks guests on %s', (path) => {
    expect(authorized(request(path), null)).toBe(false);
  });

  it.each(['/', '/store', '/cart', '/product/lamp', '/sign-in'])('lets guests view %s', (path) => {
    expect(authorized(request(path), null)).toBe(true);
  });

  it('lets signed-in users through protected pages', () => {
    expect(authorized(request('/place-order'), SESSION)).toBe(true);
  });

  it('redirects guest POSTs to sign-in with a 303 and callback URL', () => {
    const res = authorized(request('/place-order', { method: 'POST' }), null) as NextResponse;

    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toBe('http://localhost:3000/sign-in?callbackUrl=%2Fplace-order');
  });

  it('gives new visitors a session cart cookie', () => {
    const res = authorized(request('/', { cartCookie: false }), null) as NextResponse;

    expect(res).toBeInstanceOf(NextResponse);
    expect(res.cookies.get('sessionCartId')?.value).toMatch(/^[0-9a-f-]{36}$/);
  });
});
