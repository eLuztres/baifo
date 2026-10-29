import { execFile } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { cleanUpVideo, VIDEO_CLEANUP_TIMEOUT_MS } from '@/lib/marketplace/video-cleanup';

jest.mock('ffmpeg-static', () => '/usr/bin/ffmpeg');
jest.mock('node:child_process', () => ({ execFile: jest.fn() }));

type Callback = (error: Error | null, stdout?: string, stderr?: string) => void;
const ffmpeg = execFile as unknown as jest.Mock;
const argsOfLastRun = () => ffmpeg.mock.calls[0][1] as string[];

describe('cleanUpVideo', () => {
  beforeEach(() => ffmpeg.mockReset());

  it('stops ffmpeg after the time limit and returns the cleaned-up video', async () => {
    ffmpeg.mockImplementation((_bin: string, args: string[], _options: object, done: Callback) => {
      writeFileSync(args[args.length - 1], 'clean');
      done(null, '', '');
    });

    await expect(cleanUpVideo(Buffer.from('raw'))).resolves.toEqual(Buffer.from('clean'));
    expect(ffmpeg.mock.calls[0][2]).toEqual({ timeout: VIDEO_CLEANUP_TIMEOUT_MS, killSignal: 'SIGKILL' });
  });

  it('removes its temporary files when ffmpeg fails or is stopped', async () => {
    ffmpeg.mockImplementation((_bin: string, _args: string[], _options: object, done: Callback) => done(new Error('killed')));

    await expect(cleanUpVideo(Buffer.from('raw'))).rejects.toThrow('killed');
    const input = argsOfLastRun()[argsOfLastRun().indexOf('-i') + 1];
    expect(existsSync(path.dirname(input))).toBe(false);
  });
});
