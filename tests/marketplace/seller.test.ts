import { sellerIdentity } from '@/lib/marketplace/seller';

describe('sellerIdentity', () => {
  const person = { waId: '4915112345678', name: 'Lula Müller' };

  it('takes the seller\'s own name and language first', () => {
    expect(sellerIdentity({ sellerName: 'Lula', sellerLocale: 'fr', seller: person })).toEqual({ name: 'Lula', locale: 'fr' });
  });

  it('never takes the name from the number, only its language', () => {
    expect(sellerIdentity({ sellerName: null, sellerLocale: null, seller: person })).toEqual({ name: null, locale: 'de' });
  });

  it('shows no name once the admin emptied it on the listing', () => {
    expect(sellerIdentity({ sellerName: '', sellerLocale: null, seller: person }).name).toBeNull();
  });

  it('has nothing for the house seller unless the admin names one', () => {
    expect(sellerIdentity({ sellerName: null, sellerLocale: null, seller: { waId: 'baifo' } })).toEqual({ name: null, locale: null });
    expect(sellerIdentity({ sellerName: 'Baifo', sellerLocale: 'es', seller: { waId: 'baifo' } })).toEqual({ name: 'Baifo', locale: 'es' });
  });
});
