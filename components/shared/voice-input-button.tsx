'use client';

import { Loader2, Mic, Square } from 'lucide-react';
import { useI18n } from '@/components/i18n-provider';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useVoiceRecorder, type VoiceError } from '@/hooks/use-voice-recorder';
import { cn } from '@/lib/utils';

interface VoiceInputButtonProps {
  /** Gets the spoken text, to put into a field where it can still be corrected. */
  onText: (text: string) => void;
  className?: string;
}

const ERROR_KEYS = { NO_MIC: 'VOICE_NO_MIC', FAILED: 'VOICE_FAILED' } as const satisfies Record<VoiceError, string>;

const formatSeconds = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

/** Tap to speak, tap again to stop: the words come back as text. Admin fields only (/api/transcribe). */
export default function VoiceInputButton({ onText, className }: VoiceInputButtonProps) {
  const { t, locale } = useI18n();
  const { toast } = useToast();
  const { state, seconds, start, stop } = useVoiceRecorder({
    language: locale,
    onText,
    onError: (error) => toast({ variant: 'destructive', description: t(ERROR_KEYS[error]) }),
  });
  const isRecording = state === 'recording';

  return (
    <Button
      type='button'
      variant={isRecording ? 'destructive' : 'ghost'}
      className={cn('h-12 shrink-0 rounded-full', isRecording ? 'px-4' : 'w-12', className)}
      disabled={state === 'transcribing'}
      onClick={isRecording ? stop : start}
      aria-label={t(isRecording ? 'VOICE_STOP' : state === 'transcribing' ? 'VOICE_TRANSCRIBING' : 'VOICE_START')}
    >
      {state === 'transcribing' ? <Loader2 className='animate-spin' /> : isRecording ? <Square className='fill-current' /> : <Mic className='size-5' />}
      {isRecording && <span className='tabular-nums'>{formatSeconds(seconds)}</span>}
    </Button>
  );
}
