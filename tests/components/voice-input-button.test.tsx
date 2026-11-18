/** @jest-environment jsdom */
import { render } from '@testing-library/react';
import VoiceInputButton from '@/components/shared/voice-input-button';
import { useVoiceRecorder, type VoiceState } from '@/hooks/use-voice-recorder';

jest.mock('@/hooks/use-voice-recorder', () => ({ useVoiceRecorder: jest.fn() }));
jest.mock('@/components/i18n-provider', () => ({ useI18n: () => ({ t: (key: string) => key, locale: 'es' }) }));
jest.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: jest.fn() }) }));

const recorderIn = (state: VoiceState) => (useVoiceRecorder as jest.Mock).mockReturnValue({ state, seconds: 0, start: jest.fn(), stop: jest.fn() });

describe('VoiceInputButton', () => {
  it('tells while the AI turns the words into text, so a form can wait before saving', () => {
    const onTranscribing = jest.fn();
    recorderIn('transcribing');
    const { rerender, unmount } = render(<VoiceInputButton onText={jest.fn()} onTranscribing={onTranscribing} />);
    expect(onTranscribing).toHaveBeenLastCalledWith(true);

    recorderIn('idle');
    rerender(<VoiceInputButton onText={jest.fn()} onTranscribing={onTranscribing} />);
    expect(onTranscribing).toHaveBeenLastCalledWith(false);

    recorderIn('transcribing');
    rerender(<VoiceInputButton onText={jest.fn()} onTranscribing={onTranscribing} />);
    unmount();
    expect(onTranscribing).toHaveBeenLastCalledWith(false);
  });
});
