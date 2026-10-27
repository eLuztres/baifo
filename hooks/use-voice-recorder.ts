'use client';

import { useEffect, useRef, useState } from 'react';

export type VoiceState = 'idle' | 'recording' | 'transcribing';
export type VoiceError = 'NO_MIC' | 'FAILED';

interface VoiceRecorderOptions {
  language: string;
  onText: (text: string) => void;
  /** `aiCode`: what the AI said went wrong (lib/ai-errors.ts), when it was the AI. */
  onError: (error: VoiceError, aiCode?: string) => void;
}

// Stops by itself well before the recording outgrows the upload limit of /api/transcribe.
const MAX_SECONDS = 180;

/** Records the microphone until stopped, then turns the recording into text on the server. */
export function useVoiceRecorder({ language, onText, onError }: VoiceRecorderOptions) {
  const [state, setState] = useState<VoiceState>('idle');
  const [seconds, setSeconds] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const releaseMic = () => {
    clearInterval(timerRef.current);
    recorderRef.current?.stream.getTracks().forEach((track) => track.stop());
  };

  // Leaving the page mid-recording must not leave the microphone on.
  useEffect(() => releaseMic, []);

  const transcribe = async (audio: Blob) => {
    setState('transcribing');
    try {
      const form = new FormData();
      form.set('audio', audio);
      form.set('language', language);
      const response = await fetch('/api/transcribe', { method: 'POST', body: form });
      const { text, code } = await response.json();
      if (response.ok && text) onText(text);
      else onError('FAILED', code ?? undefined);
    } catch {
      onError('FAILED');
    } finally {
      setState('idle');
    }
  };

  const start = async () => {
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      return onError('NO_MIC');
    }
    const recorder = new MediaRecorder(stream);
    const chunks: Blob[] = [];
    recorder.ondataavailable = (event) => chunks.push(event.data);
    recorder.onstop = () => {
      releaseMic();
      transcribe(new Blob(chunks, { type: recorder.mimeType }));
    };
    recorderRef.current = recorder;
    recorder.start();
    setSeconds(0);
    setState('recording');
    timerRef.current = setInterval(() => {
      setSeconds((current) => {
        if (current + 1 >= MAX_SECONDS && recorder.state === 'recording') recorder.stop();
        return current + 1;
      });
    }, 1000);
  };

  const stop = () => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  };

  return { state, seconds, start, stop };
}
