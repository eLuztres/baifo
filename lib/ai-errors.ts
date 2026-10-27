import type { TranslationKey, Translator } from '@/lib/i18n-core';

// No server imports: the listing pages in the browser read a stored failure (Submission.lastError) with it too.

/** The kinds lib/studio/openai.mjs sorts every failed AI call into. */
const AI_ERROR_KEYS = {
  refused: 'AI_ERROR_REFUSED',
  no_credit: 'AI_ERROR_NO_CREDIT',
  invalid_key: 'AI_ERROR_INVALID_KEY',
  not_configured: 'AI_ERROR_NOT_CONFIGURED',
  busy: 'AI_ERROR_BUSY',
  offline: 'AI_ERROR_OFFLINE',
  unavailable: 'AI_ERROR_UNAVAILABLE',
  unknown: 'AI_ERROR_UNKNOWN',
} as const satisfies Record<string, TranslationKey>;

type AiErrorKind = keyof typeof AI_ERROR_KEYS;

const CODE_PREFIX = 'ai:';
const isKind = (value: unknown): value is AiErrorKind => typeof value === 'string' && value in AI_ERROR_KEYS;

/** A failed AI call as a short code to store or send ("ai:refused:sexual"), or null for any other error. */
export function aiErrorCode(error: unknown): string | null {
  const { aiKind, aiReason } = (error ?? {}) as { aiKind?: unknown; aiReason?: unknown };
  if (!isKind(aiKind)) return null;
  return `${CODE_PREFIX}${aiKind}${typeof aiReason === 'string' && aiReason ? `:${aiReason.slice(0, 300)}` : ''}`;
}

/** What went wrong with the AI, in the admin's language: from the error itself or its stored code; null if it wasn't the AI. */
export function aiErrorText(t: Translator, errorOrCode: unknown): string | null {
  const code = typeof errorOrCode === 'string' ? errorOrCode : aiErrorCode(errorOrCode);
  if (!code?.startsWith(CODE_PREFIX)) return null;
  const [kind, ...reason] = code.slice(CODE_PREFIX.length).split(':');
  if (!isKind(kind)) return null;
  const because = reason.join(':');
  if (kind === 'refused' && because) return t('AI_ERROR_REFUSED_BECAUSE', { reason: because });
  if (kind === 'unknown' && because) return t('AI_ERROR_UNKNOWN_BECAUSE', { reason: because });
  return t(AI_ERROR_KEYS[kind]);
}
