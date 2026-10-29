import { APP_NAME, SERVER_URL } from '@/lib/constants';
import { contactMessage } from '@/lib/contact-message';
import { getTranslator } from '@/lib/i18n';
import { getContactMessageTexts } from '@/lib/marketplace/contact-texts';

jest.mock('@/lib/i18n-server', () => ({ getShopLocale: () => 'es' }));

const CLOCK = {
  slug: 'reloj-antiguo',
  type: 'PRODUCT' as const,
  name: 'Reloj antiguo',
  translations: { fr: { name: 'Horloge ancienne' } },
};
const CLOCK_URL = `${SERVER_URL}/product/reloj-antiguo`;

describe('getContactMessageTexts', () => {
  it("always writes in the shop's language, with the listing's name and its link", () => {
    const texts = getContactMessageTexts(CLOCK);

    expect(contactMessage(texts, 'Lula')).toBe(`¡Hola! Soy Lula.\nMe interesa tu anuncio en ${APP_NAME}:\n\n«Reloj antiguo»\n${CLOCK_URL}\n\n`);
    expect(contactMessage(texts, '')).toBe(`¡Hola!\nMe interesa tu anuncio en ${APP_NAME}:\n\n«Reloj antiguo»\n${CLOCK_URL}\n\n`);
  });

  it('fits the wording to a wanted ad, a service and an event', () => {
    const t = getTranslator('es');

    for (const type of ['WANTED', 'SERVICE', 'EVENT'] as const) {
      const { body } = getContactMessageTexts({ ...CLOCK, type });
      expect(body).toBe(t(`CONTACT_MESSAGE_${type}`, { name: 'Reloj antiguo', shop: APP_NAME, url: CLOCK_URL }));
    }
    expect(getContactMessageTexts({ ...CLOCK, type: 'WANTED' }).body).toContain('Tengo lo que buscas');
  });
});
