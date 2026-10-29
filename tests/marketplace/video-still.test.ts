import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import ffmpegPath from 'ffmpeg-static';
import { takeVideoStill } from '@/lib/marketplace/video-cleanup';

const run = promisify(execFile);

// A real test video made by ffmpeg itself, so the real frame taking runs.
async function testVideo(seconds: number, size: string) {
  const folder = await mkdtemp(path.join(tmpdir(), 'still-test-'));
  const file = path.join(folder, 'clip.mp4');
  try {
    await run(ffmpegPath!, ['-v', 'error', '-y', '-f', 'lavfi', '-i', `testsrc=duration=${seconds}:size=${size}:rate=10`, '-pix_fmt', 'yuv420p', file]);
    return await readFile(file);
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
}

// A JPEG's width, from its SOF0 header.
const jpegWidth = (jpeg: Buffer) => jpeg.readUInt16BE(jpeg.indexOf(Buffer.from([0xff, 0xc0])) + 7);
const isJpeg = (file: Buffer) => file[0] === 0xff && file[1] === 0xd8;

describe('takeVideoStill', () => {
  jest.setTimeout(30000);

  it('takes a JPEG of a video, at most 1280 px wide', async () => {
    const still = await takeVideoStill(await testVideo(2, '1920x1080'));

    expect(isJpeg(still)).toBe(true);
    expect(jpegWidth(still)).toBe(1280);
  });

  it('keeps a small video at its size', async () => {
    expect(jpegWidth(await takeVideoStill(await testVideo(2, '320x240')))).toBe(320);
  });

  it('takes the first frame of a video shorter than a second', async () => {
    expect(isJpeg(await takeVideoStill(await testVideo(0.4, '320x240')))).toBe(true);
  });

  it('fails on a file that is no video', async () => {
    await expect(takeVideoStill(Buffer.from('not a video'))).rejects.toThrow();
  });
});
