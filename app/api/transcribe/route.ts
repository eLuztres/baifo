import { z } from 'zod';
import { isAdmin } from '@/lib/auth-guard';
import { transcribeAudio } from '@/lib/ai-usage';

// Vercel takes at most 4.5 MB per request: several minutes of speech.
const MAX_AUDIO_BYTES = 4 * 1024 * 1024;

const voiceNoteSchema = z.object({
  audio: z.instanceof(Blob).refine((audio) => audio.size > 0 && audio.size <= MAX_AUDIO_BYTES),
  language: z.string().regex(/^[a-z]{2}$/).optional(),
});

/** An admin's voice note as text. */
export async function POST(request: Request) {
  if (!(await isAdmin())) return Response.json({ error: 'ADMIN_ONLY' }, { status: 403 });
  const form = await request.formData().catch(() => null);
  const parsed = voiceNoteSchema.safeParse({ audio: form?.get('audio'), language: form?.get('language') ?? undefined });
  if (!parsed.success) return Response.json({ error: 'BAD_AUDIO' }, { status: 400 });
  try {
    return Response.json({ text: await transcribeAudio(parsed.data.audio, parsed.data.language) });
  } catch (error) {
    console.error('[transcribe] Voice note not transcribed:', error);
    return Response.json({ error: 'FAILED' }, { status: 502 });
  }
}
