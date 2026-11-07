import { NextResponse, type NextRequest } from 'next/server';
import { runAsListingActor } from '@/lib/listing-log';
import { expireListings } from '@/lib/marketplace/expiry';
import { findStuckSubmissions, processSubmission } from '@/lib/marketplace/processing';

export const maxDuration = 300;

// Vercel Cron calls this with "Authorization: Bearer <CRON_SECRET>".
export async function GET(request: NextRequest) {
  if (!process.env.CRON_SECRET || request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }
  return runAsListingActor({ type: 'system' }, async () => {
    const stuck = await findStuckSubmissions();
    for (const { id } of stuck) await processSubmission(id);
    const expiry = await expireListings();
    return NextResponse.json({ retried: stuck.length, ...expiry });
  });
}
