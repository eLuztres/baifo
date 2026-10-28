// Outside the 24-hour window WhatsApp only delivers approved templates. Each message below has one, made in
// WhatsApp Manager with the same name and its texts as body parameters ({{1}}, {{2}}, …), see docs/MARKETPLACE.md.
import { sendTemplate, WINDOW_CLOSED_CODE } from '@/lib/whatsapp-cloud/client';
import type { BotLocale } from './messages';

/** The template names as approved in WhatsApp Manager. */
export const WHATSAPP_TEMPLATES = {
  reviewRequest: 'review_request',
  paymentLink: 'payment_link',
  listingLive: 'listing_live',
  adminNewListing: 'admin_new_listing',
  listingExpiring: 'listing_expiring',
} as const;

export type TemplateKey = keyof typeof WHATSAPP_TEMPLATES;

export interface TemplateMessage {
  key: TemplateKey;
  locale: BotLocale;
  parameters: string[];
  /** Payloads of the template's quick-reply buttons, in order. */
  buttonPayloads?: string[];
}

/** Meta's error code when the template doesn't exist in the asked language. */
export const TEMPLATE_LANGUAGE_MISSING_CODE = 132001;
const FALLBACK_LANGUAGE: BotLocale = 'es';
const MAX_PARAMETER_LENGTH = 500;

const hasCode = (error: unknown, code: number) => error instanceof Error && 'code' in error && code !== undefined && error.code === code;

/** Meta refuses parameters that are empty or have line breaks, tabs or more than four spaces in a row. */
export const toTemplateParameter = (text: string) =>
  text
    .replace(/\s*\n\s*/g, ' · ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_PARAMETER_LENGTH) || '-';

async function sendAsTemplate(to: string, { key, locale, parameters, buttonPayloads }: TemplateMessage) {
  const send = (language: string) => sendTemplate(to, WHATSAPP_TEMPLATES[key], language, parameters.map(toTemplateParameter), buttonPayloads);
  try {
    return await send(locale);
  } catch (error) {
    // Not every template has every language yet: Spanish is always there.
    if (!hasCode(error, TEMPLATE_LANGUAGE_MISSING_CODE) || locale === FALLBACK_LANGUAGE) throw error;
    return send(FALLBACK_LANGUAGE);
  }
}

/**
 * Sends the normal message and, when the 24-hour window is closed, its template instead. A failing template is only
 * logged, as the step around it (approval, going live) has already happened; other errors are thrown as before.
 */
export async function sendWithTemplateFallback<T>(to: string, send: () => Promise<T>, template: TemplateMessage) {
  try {
    return await send();
  } catch (error) {
    if (!hasCode(error, WINDOW_CLOSED_CODE)) throw error;
  }
  try {
    return await sendAsTemplate(to, template);
  } catch (error) {
    console.error(`WhatsApp template ${WHATSAPP_TEMPLATES[template.key]} to ${to} failed`, error);
  }
}
