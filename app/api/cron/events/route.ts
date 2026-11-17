import { NextResponse, type NextRequest } from 'next/server';
import { runAsListingActor } from '@/lib/listing-log';
import { moveRepeatingEvents } from '@/lib/marketplace/expiry';

// Just after midnight, so a repeating event never drops out of the shop until the morning run; it sends no messages.
export async function GET(request: NextRequest) {
  if (!process.env.CRON_SECRET || request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }
  return runAsListingActor({ type: 'system' }, async () => NextResponse.json(await moveRepeatingEvents()));
}
