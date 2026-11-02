import { APP_NAME, SERVER_URL } from '@/lib/constants';
import { getTranslator, LOCALES } from '@/lib/i18n';
import { getContactMessage } from '@/lib/marketplace/contact-texts';

jest.mock('@/lib/i18n-server', () => ({ getShopLocale: () => 'es' }));

const CLOCK = {
  slug: 'reloj-antiguo',
  type: 'PRODUCT' as const,
  name: 'Reloj antiguo',
  translations: { fr: { name: 'Horloge ancienne' } },
};
const CLOCK_URL = `${SERVER_URL}/product/reloj-antiguo`;

describe('getContactMessage', () => {
  it("always writes in the shop's language, with the listing's name and its link", () => {
    expect(getContactMessage(CLOCK)).toBe(`¡Hola!\nMe interesa tu anuncio en ${APP_NAME}:\n\n«Reloj antiguo»\n${CLOCK_URL}\n\n\n\u200B`);
  });

  it('fits the wording to a wanted ad, a service and an event', () => {
    const t = getTranslator('es');

    for (const type of ['WANTED', 'SERVICE', 'EVENT'] as const) {
      expect(getContactMessage({ ...CLOCK, type })).toBe(t(`CONTACT_MESSAGE_${type}`, { hello: '¡Hola!', name: 'Reloj antiguo', shop: APP_NAME, url: CLOCK_URL }).trimEnd() + '\n\n\n\u200B');
    }
    expect(getContactMessage({ ...CLOCK, type: 'WANTED' })).toContain('Tengo lo que buscas');
  });

  it('has a message for every listing type in every language', () => {
    for (const { id } of LOCALES) {
      const t = getTranslator(id);
      for (const key of ['CONTACT_MESSAGE_PRODUCT', 'CONTACT_MESSAGE_WANTED', 'CONTACT_MESSAGE_SERVICE', 'CONTACT_MESSAGE_EVENT'] as const) {
        expect(t(key)).toMatch(/^\{hello\}\n.*\{shop\}.*\{name\}.*\{url\}/s);
        // An emoji can arrive as � when a wa.me link opens WhatsApp on a computer.
        expect(t(key)).not.toMatch(/\p{Extended_Pictographic}/u);
      }
    }
  });
});
