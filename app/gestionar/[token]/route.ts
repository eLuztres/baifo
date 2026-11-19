import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/db/prisma';
import { PARTNER_COOKIE, PARTNER_COOKIE_DAYS } from '@/lib/partner-access';
import { PARTNER_PANEL_PATH } from '@/lib/partner-paths';

/** A partner's private link: it opens its panel in this browser, then shows the panel without the secret in the address. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const partner = await prisma.partner.findUnique({ where: { token }, select: { id: true } });
  const response = NextResponse.redirect(new URL(PARTNER_PANEL_PATH, request.nextUrl.origin));
  // An old link (a new one was made) signs this browser out instead, so the panel says the link no longer works.
  if (!partner) {
    response.cookies.delete(PARTNER_COOKIE);
    return response;
  }
  response.cookies.set(PARTNER_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: PARTNER_COOKIE_DAYS * 24 * 60 * 60,
  });
  return response;
}
