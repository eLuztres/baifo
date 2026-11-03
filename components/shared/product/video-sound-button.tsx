'use client';

import { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { useI18n } from '@/components/i18n-provider';
import { cn } from '@/lib/utils';
import { playWithSound } from '@/lib/video-full-screen';

interface VideoSoundButtonProps {
  /** The video on screen now; memoized, so a new one means another video is shown. */
  getVideo: () => HTMLVideoElement | null | undefined;
  className?: string;
}

/** Tries the sound as soon as a video shows. Browsers often refuse that before a tap, so this says plainly how to turn it on. */
export default function VideoSoundButton({ getVideo, className }: VideoSoundButtonProps) {
  const { t } = useI18n();
  const [video, setVideo] = useState<HTMLVideoElement | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const hasTurnedOff = useRef(false);

  useEffect(() => {
    const shown = getVideo();
    // The gallery for the other screen size is hidden, and stays quiet.
    if (!shown?.getClientRects().length) {
      setVideo(null);
      return;
    }
    const syncMuted = () => setIsMuted(shown.muted);
    shown.addEventListener('volumechange', syncMuted);
    if (!hasTurnedOff.current) playWithSound(shown);
    syncMuted();
    setVideo(shown);
    return () => {
      shown.removeEventListener('volumechange', syncMuted);
      shown.muted = true;
    };
  }, [getVideo]);

  if (!video) return null;

  const toggle = () => {
    hasTurnedOff.current = !isMuted;
    if (isMuted) playWithSound(video);
    else video.muted = true;
  };

  return (
    <button
      type='button'
      onClick={toggle}
      aria-label={t(isMuted ? 'VIDEO_SOUND_ON' : 'VIDEO_SOUND_OFF')}
      className={cn('absolute z-10 flex h-11 items-center gap-2 rounded-full border border-border bg-background/85 px-3.5 text-sm font-medium text-foreground backdrop-blur-sm', className)}
    >
      {isMuted ? <VolumeX className='size-5' aria-hidden /> : <Volume2 className='size-5' aria-hidden />}
      {isMuted && t('VIDEO_SOUND_ON')}
    </button>
  );
}
