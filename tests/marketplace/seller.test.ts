import { sellerIdentity } from '@/lib/marketplace/seller';

describe('sellerIdentity', () => {
  const person = { waId: '4915112345678', name: 'Lula Müller' };

  it('takes the seller\'s own name and language first', () => {
    expect(sellerIdentity({ sellerName: 'Lula', sellerLocale: 'fr', seller: person })).toEqual({ name: 'Lula', locale: 'fr' });
  });

  it('falls back to the WhatsApp name and the language of the number', () => {
    expect(sellerIdentity({ sellerName: null, sellerLocale: null, seller: person })).toEqual({ name: 'Lula Müller', locale: 'de' });
  });

  it('has nothing for the house seller unless the admin names one', () => {
    expect(sellerIdentity({ sellerName: null, sellerLocale: null, seller: { waId: 'baifo', name: null } })).toEqual({ name: null, locale: null });
    expect(sellerIdentity({ sellerName: 'Baifo', sellerLocale: 'es', seller: { waId: 'baifo', name: null } })).toEqual({ name: 'Baifo', locale: 'es' });
  });
});
