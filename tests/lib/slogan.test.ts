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

  it('keeps the shop name in the home page title, which now leads with what people search for', () => {
    for (const { id } of LOCALES) {
      expect(getTranslator(id)('HOME_SEO_TITLE', { shop: 'Baifo' })).toMatch(/ \| Baifo$/);
    }
  });
});
