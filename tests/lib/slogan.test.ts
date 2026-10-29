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

  it('is the same slogan as the home page title', () => {
    for (const { id } of LOCALES) {
      const t = getTranslator(id);
      expect(t('BRAND_SLOGAN', { shop: 'Baifo' })).toBe(`${t('HOME_SEO_TITLE', { shop: 'Baifo' })}.`);
    }
  });
});
