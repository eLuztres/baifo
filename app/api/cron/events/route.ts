import { NextResponse, type NextRequest } from 'next/server';
import { runAsListingActor } from '@/lib/listing-log';
import { moveRepeatingEvents } from '@/lib/marketplace/expiry';
import { publishScheduledListings } from '@/lib/marketplace/publish';

// Just after midnight, so a repeating event never drops out of the shop until the morning run, and the day's scheduled
// listings (e.g. the day's phrase) start the day online; it sends no messages.
export async function GET(request: NextRequest) {
  if (!process.env.CRON_SECRET || request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }
  return runAsListingActor({ type: 'system' }, async () => {
    // First, so a problem with the events never keeps the day's listings offline.
    const scheduled = await publishScheduledListings();
    return NextResponse.json({ ...(await moveRepeatingEvents()), ...scheduled });
  });
}
