import { NextResponse } from 'next/server';
import { DEPLOYMENT_VERSION } from '@/lib/constants';

export const dynamic = 'force-dynamic';

/** The deploy that is live now; the home-screen app compares it with the one it was loaded from. */
export function GET() {
  return NextResponse.json({ version: DEPLOYMENT_VERSION }, { headers: { 'Cache-Control': 'no-store' } });
}
