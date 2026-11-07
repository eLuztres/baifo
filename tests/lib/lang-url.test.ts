import { urlLocaleOf, withLang } from '@/lib/i18n-core';

describe('withLang', () => {
  it('adds the language to a plain path', () => {
    expect(withLang('/product/lamp', 'de')).toBe('/product/lamp?lang=de');
  });

  it('keeps the other parameters and the #part, and replaces an old language', () => {
    expect(withLang('/explore?mercadillo=magma', 'fr')).toBe('/explore?mercadillo=magma&lang=fr');
    expect(withLang('/product/lamp?lang=en&c=bikes#info', 'es')).toBe('/product/lamp?lang=es&c=bikes#info');
  });
});

describe('urlLocaleOf', () => {
  const page = (path: string) => new URL(`https://baifo.es${path}`);

  it('takes the URL’s own language first', () => {
    expect(urlLocaleOf(page('/explore?lang=de'), 'https://baifo.es/?lang=fr')).toBe('de');
  });

  it('keeps the language of the page on this site the visitor came from', () => {
    expect(urlLocaleOf(page('/explore'), 'https://baifo.es/product/lamp?lang=de')).toBe('de');
  });

  it('ignores other sites and visits without a page before', () => {
    expect(urlLocaleOf(page('/explore'), 'https://evil.example/?lang=de')).toBeNull();
    expect(urlLocaleOf(page('/explore'), 'not a url')).toBeNull();
    expect(urlLocaleOf(page('/explore'), null)).toBeNull();
    expect(urlLocaleOf(page('/explore'), 'https://baifo.es/explore')).toBeNull();
  });
});
