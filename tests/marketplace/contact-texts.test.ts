import { prisma } from '@/db/prisma';
import { APP_NAME, SERVER_URL } from '@/lib/constants';
import { contactMessage } from '@/lib/contact-message';
import { getTranslator } from '@/lib/i18n';
import { getContactMessageTexts } from '@/lib/marketplace/contact-texts';

jest.mock('@/lib/i18n-server', () => ({ getShopLocale: () => 'es', getEnabledLocales: () => ['es', 'en', 'fr'] }));
jest.mock('@/db/prisma', () => ({ prisma: { seller: { findUnique: jest.fn() } } }));

const findSeller = prisma.seller.findUnique as jest.Mock;
const CLOCK = {
  slug: 'reloj-antiguo',
  type: 'PRODUCT' as const,
  sellerId: 'seller-1',
  name: 'Reloj antiguo',
  translations: { fr: { name: 'Horloge ancienne' } },
};
const CLOCK_URL = `${SERVER_URL}/product/reloj-antiguo`;

describe('getContactMessageTexts', () => {
  beforeEach(() => findSeller.mockReset());

  it("writes in the seller's language, with the listing's name in it and its link", async () => {
    findSeller.mockResolvedValue({ waId: '34600111222' });
    const texts = await getContactMessageTexts(CLOCK);

    expect(contactMessage(texts, 'Lula')).toBe(`¡Hola! Soy Lula 👋 Te escribo por tu anuncio «Reloj antiguo» en ${APP_NAME}: ${CLOCK_URL}`);
    expect(contactMessage(texts, '')).toBe(`¡Hola! 👋 Te escribo por tu anuncio «Reloj antiguo» en ${APP_NAME}: ${CLOCK_URL}`);
  });

  it("uses the listing's translated name in that language", async () => {
    findSeller.mockResolvedValue({ waId: '33612345678' });
    const texts = await getContactMessageTexts(CLOCK);

    expect(contactMessage(texts, 'Lula')).toBe(
      `Bonjour ! Je suis Lula 👋 Je vous écris pour votre annonce « Horloge ancienne » sur ${APP_NAME} : ${CLOCK_URL}`
    );
  });

  it("falls back to the shop's language when the seller's language is not enabled or there is no seller", async () => {
    findSeller.mockResolvedValue({ waId: '39333111222' });
    expect((await getContactMessageTexts(CLOCK)).hello).toBe('¡Hola!');

    const texts = await getContactMessageTexts({ ...CLOCK, sellerId: null });
    expect(findSeller).toHaveBeenCalledTimes(1);
    expect(texts.hello).toBe('¡Hola!');
  });

  it('fits the wording to a wanted ad, a service and an event', async () => {
    findSeller.mockResolvedValue({ waId: '34600111222' });
    const t = getTranslator('es');

    for (const type of ['WANTED', 'SERVICE', 'EVENT'] as const) {
      const { body } = await getContactMessageTexts({ ...CLOCK, type });
      expect(body).toBe(t(`CONTACT_MESSAGE_${type}`, { name: 'Reloj antiguo', shop: APP_NAME, url: CLOCK_URL }));
    }
    expect((await getContactMessageTexts({ ...CLOCK, type: 'WANTED' })).body).toContain('Tengo lo que buscas');
  });
});
