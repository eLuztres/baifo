import { NextResponse, type NextRequest } from 'next/server';
import { findOpenInvite, INVITE_COOKIE } from '@/lib/invites';

/** An invite link: remembers the invite, then opens sign-up, which shows whether it is still valid. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const response = NextResponse.redirect(new URL('/sign-up', request.url));
  const invite = await findOpenInvite(token);
  if (invite) {
    // Lax, so it also comes back with the redirect from Google.
    response.cookies.set(INVITE_COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: request.nextUrl.protocol === 'https:', path: '/', expires: invite.expiresAt });
  }
  return response;
}
