import { generateRingView } from '@/lib/actions/studio.actions';

// A route, not a server action: Next.js queues server actions one at a time, this lets all views run in parallel.
export const maxDuration = 300;

export async function POST(request: Request) {
  const { photoUrl, view, categoryId } = await request.json().catch(() => ({}));
  return Response.json(await generateRingView(photoUrl, view, categoryId));
}
