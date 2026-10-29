import { adminTexts, markSoldText, statusText } from '@/lib/marketplace/admin-texts';
import type { Locale } from '@/lib/i18n-core';

const LOCALES: Locale[] = ['es', 'en', 'it', 'fr', 'de'];
const OTHER_TYPES = ['SERVICE', 'EVENT', 'WANTED'] as const;

describe('the "sold" words per listing type', () => {
  it.each(LOCALES)('keeps the product wording and gives every other type its own (%s)', (locale) => {
    const texts = adminTexts(locale);
    expect(markSoldText(texts, 'PRODUCT')).toBe(texts.markSold);
    expect(statusText(texts, 'SOLD', 'PRODUCT')).toBe(texts.status_SOLD);
    for (const type of OTHER_TYPES) {
      expect(markSoldText(texts, type)).toBeTruthy();
      expect(markSoldText(texts, type)).not.toBe(texts.markSold);
      expect(statusText(texts, 'SOLD', type)).toBeTruthy();
      expect(statusText(texts, 'SOLD', type)).not.toBe(texts.status_SOLD);
    }
  });

  it('leaves the other statuses alone, and "sold" without a type stays generic', () => {
    const texts = adminTexts('es');
    expect(statusText(texts, 'LIVE', 'SERVICE')).toBe(texts.status_LIVE);
    expect(statusText(texts, 'SOLD')).toBe('Vendido');
    expect(statusText(texts, 'SOLD', 'WANTED')).toBe('Encontrado');
  });
});
