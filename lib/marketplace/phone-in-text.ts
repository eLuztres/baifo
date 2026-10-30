// A Spanish number (6, 7, 8 or 9 and eight more digits), maybe with +34/0034 and spaces, dots or dashes between the digits.
const PHONE_CANDIDATE = /(^|[^\d+])((?:(?:\+|00)\s?34[\s.-]?)?[6-9](?:[\s.-]?\d){8})(?![\d:]|[.,]\d)/g;

/** The first phone number written in a text, as written; empty: none. */
export function findPhoneInText(text: string): string {
  for (const [, , candidate] of text.matchAll(PHONE_CANDIDATE)) {
    const number = candidate.replace(/^(?:\+|00)\s?34[\s.-]?/, '');
    // Digits in groups of one are a date ("6.10.2026 20:00"), never how a phone is written.
    if (number.split(/[\s.-]/).every((group) => group.length > 1)) return candidate;
  }
  return '';
}
