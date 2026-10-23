import { regenerateRingViews } from '@/lib/actions/studio.actions';

// Three AI views of one ring take up to a few minutes; a route keeps them off the server-action queue.
export const maxDuration = 300;

export async function POST(request: Request) {
  const { productId } = await request.json().catch(() => ({}));
  return Response.json(await regenerateRingViews(productId));
}
