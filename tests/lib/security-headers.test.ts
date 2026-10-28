import { NextRequest } from 'next/server';
import nextConfig from '@/next.config';
import { middleware } from '@/middleware';
import { buildContentSecurityPolicy } from '@/lib/security-headers';

jest.mock('better-auth/cookies', () => ({ getSessionCookie: () => null }));

const directive = (policy: string, name: string) =>
  policy.split('; ').find((part) => part.startsWith(`${name} `)) ?? '';

describe('security headers', () => {
  it('sends the browser security headers on every route', async () => {
    const rules = await nextConfig.headers!();
    const allRoutes = rules.find((rule) => rule.source === '/:path*');
    const headers = Object.fromEntries(allRoutes!.headers.map(({ key, value }) => [key, value]));

    expect(headers['X-Content-Type-Options']).toBe('nosniff');
    expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    expect(headers['X-Frame-Options']).toBe('DENY');
    expect(headers['Cross-Origin-Opener-Policy']).toBe('same-origin-allow-popups');
    expect(headers['Permissions-Policy']).toContain('camera=(self)');
    expect(headers['Permissions-Policy']).toContain('microphone=(self)');
    expect(headers['Permissions-Policy']).toContain('geolocation=()');
    expect(nextConfig.poweredByHeader).toBe(false);
  });

  it('gives pages a nonce-based Content-Security-Policy', () => {
    const res = middleware(new NextRequest('http://localhost:3000/'));
    const policy = res.headers.get('Content-Security-Policy') ?? '';

    expect(directive(policy, 'script-src')).toMatch(/'nonce-[\w+/=]+' 'strict-dynamic'/);
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("base-uri 'self'");
  });

  it('allows no eval in production', () => {
    const policy = buildContentSecurityPolicy({ nonce: 'abc', isDev: false });

    expect(policy).not.toContain("'unsafe-eval'");
    expect(directive(policy, 'script-src')).not.toContain("'unsafe-inline'");
    expect(policy).toContain('upgrade-insecure-requests');
    expect(policy).not.toContain('ws:');
  });

  it('allows eval and the HMR socket in dev only', () => {
    const policy = buildContentSecurityPolicy({ nonce: 'abc', isDev: true });

    expect(directive(policy, 'script-src')).toContain("'unsafe-eval'");
    expect(directive(policy, 'connect-src')).toContain('ws:');
    expect(policy).not.toContain('upgrade-insecure-requests');
  });

  it('adds the shop’s own https origins from CSP_EXTRA_ORIGINS and drops anything else', () => {
    process.env.CSP_EXTRA_ORIGINS = 'https://cdn.example.com, http://insecure.example.com https://*.images.example.com';
    const policy = buildContentSecurityPolicy({ nonce: 'abc', isDev: false });
    delete process.env.CSP_EXTRA_ORIGINS;

    expect(directive(policy, 'img-src')).toContain('https://cdn.example.com https://*.images.example.com');
    expect(policy).not.toContain('insecure.example.com');
  });
});
