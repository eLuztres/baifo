import { aiErrorCode, aiErrorText } from '@/lib/ai-errors';
import { createTranslator } from '@/lib/i18n-core';
import en from '@/resources/en.json';

const t = createTranslator(en);

// What lib/studio/openai.mjs throws for a failed call (Jest can't load the .mjs itself).
const aiFailure = (aiKind: string, aiReason = '') => Object.assign(new Error('400 …'), { aiKind, aiReason });

describe('aiErrorCode', () => {
  it('keeps the kind and the reason of a failed AI call', () => {
    expect(aiErrorCode(aiFailure('refused', 'sexual'))).toBe('ai:refused:sexual');
    expect(aiErrorCode(aiFailure('no_credit'))).toBe('ai:no_credit');
  });

  it('has no code for an error that was not the AI', () => {
    expect(aiErrorCode(new Error('database down'))).toBeNull();
    expect(aiErrorCode(aiFailure('made_up'))).toBeNull();
  });
});

describe('aiErrorText', () => {
  it('says the safety system refused it, and why', () => {
    expect(aiErrorText(t, aiFailure('refused', 'sexual'))).toBe(t('AI_ERROR_REFUSED_BECAUSE', { reason: 'sexual' }));
    expect(aiErrorText(t, aiFailure('refused'))).toBe(t('AI_ERROR_REFUSED'));
  });

  it('says what else went wrong: no credit, offline, busy …', () => {
    expect(aiErrorText(t, aiFailure('no_credit'))).toBe(t('AI_ERROR_NO_CREDIT'));
    expect(aiErrorText(t, aiFailure('offline'))).toBe(t('AI_ERROR_OFFLINE'));
    expect(aiErrorText(t, aiFailure('busy'))).toBe(t('AI_ERROR_BUSY'));
  });

  it("passes on OpenAI's words for anything else, also a reason with a colon", () => {
    expect(aiErrorText(t, aiFailure('unknown', 'Invalid size: 10x10'))).toBe(t('AI_ERROR_UNKNOWN_BECAUSE', { reason: 'Invalid size: 10x10' }));
  });

  it('reads a stored code, and leaves other errors to the caller', () => {
    expect(aiErrorText(t, 'ai:no_credit')).toBe(t('AI_ERROR_NO_CREDIT'));
    expect(aiErrorText(t, 'No photo to work with')).toBeNull();
    expect(aiErrorText(t, new Error('database down'))).toBeNull();
  });
});
