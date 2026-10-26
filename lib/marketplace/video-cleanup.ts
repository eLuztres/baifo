import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import ffmpegPath from 'ffmpeg-static';

const run = promisify(execFile);

// Smaller first (the longer side at most 1920 px), then steadier, less noisy, evenly lit, a bit livelier and crisper.
const VIDEO_FILTERS = [
  "scale='if(gt(iw,ih),min(1920,iw),-2)':'if(gt(iw,ih),-2,min(1920,ih))'",
  'deshake',
  'hqdn3d=2:2:4:4',
  'normalize=smoothing=50:independence=0:strength=0.6',
  'eq=saturation=1.1',
  'unsharp=5:5:0.4',
].join(',');

// Rumble and hiss out, the voice at a common loudness.
const AUDIO_FILTERS = 'highpass=f=80,afftdn,loudnorm=I=-16:TP=-1.5:LRA=11';

/**
 * No AI can edit a video any more (OpenAI's Videos API shut down on 2026-09-24), so a phone video gets a
 * clean-up instead, without changing anyone in it. The result is an H.264 MP4 that every browser plays.
 */
export async function cleanUpVideo(video: Buffer): Promise<Buffer> {
  if (!ffmpegPath) throw new Error('ffmpeg is missing for this platform');
  const folder = await mkdtemp(path.join(tmpdir(), 'video-'));
  const input = path.join(folder, 'input');
  const output = path.join(folder, 'output.mp4');
  try {
    await writeFile(input, video);
    await run(ffmpegPath, [
      '-y', '-i', input,
      '-map', '0:v:0', '-map', '0:a:0?',
      '-vf', VIDEO_FILTERS, '-af', AUDIO_FILTERS,
      // At most about 6 Mbit/s, so the page loads quickly even on mobile data.
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-maxrate', '6M', '-bufsize', '12M', '-pix_fmt', 'yuv420p',
      // loudnorm works at 192 kHz inside; back to the usual 48 kHz.
      '-c:a', 'aac', '-b:a', '128k', '-ar', '48000',
      '-movflags', '+faststart',
      output,
    ]);
    return await readFile(output);
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
}
