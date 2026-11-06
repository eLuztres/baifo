import { LOCALES, getTranslator } from '@/lib/i18n';
import en from '@/resources/en.json';

describe('brand slogan', () => {
  it('stays empty in the template texts so other shops show no slogan', () => {
    expect(en.BRAND_SLOGAN).toBe('');
  });

  it.each(LOCALES.map(({ id }) => id))('fills in the shop name in %s', (locale) => {
    const slogan = getTranslator(locale)('BRAND_SLOGAN', { shop: 'Baifo' });
    expect(slogan).toMatch(/^Baifo /);
    expect(slogan).not.toContain('{shop}');
  });

  // #534: the tab and Google show only what people search for, e.g. "Anuncios de Fuerteventura".
  it('gives the home page a title of its own, without the shop name', () => {
    for (const { id } of LOCALES) {
      const title = getTranslator(id)('HOME_SEO_TITLE', { shop: 'Baifo' });
      expect(title).toContain('Fuerteventura');
      expect(title).not.toContain('Baifo');
    }
  });
});
