import { cleanEmail, cleanInstagram, cleanWeb, webLabel } from '@/lib/marketplace/contact-ways';
import { listingContactsSchema } from '@/lib/validators';

describe('listing contact ways', () => {
  it('keeps a full email and refuses a half one', () => {
    expect(cleanEmail(' ana@correo.es ')).toBe('ana@correo.es');
    expect(cleanEmail('ana@correo')).toBeNull();
    expect(cleanEmail('')).toBe('');
  });

  it('turns a web address into a link, and never anything but a web page', () => {
    expect(cleanWeb('anaceramica.es')).toBe('https://anaceramica.es/');
    expect(cleanWeb('http://ana.es/tienda')).toBe('http://ana.es/tienda');
    expect(cleanWeb('javascript:alert(1)')).toBeNull();
    expect(cleanWeb('ana ceramica')).toBeNull();
    expect(webLabel('https://www.anaceramica.es/')).toBe('anaceramica.es');
  });

  it('reads an Instagram user however it is written', () => {
    expect(cleanInstagram('@ana.ceramica')).toBe('ana.ceramica');
    expect(cleanInstagram('https://www.instagram.com/ana.ceramica/?hl=es')).toBe('ana.ceramica');
    expect(cleanInstagram('ana ceramica')).toBeNull();
  });

  it('saves empty fields as none and refuses a wrong one', () => {
    expect(listingContactsSchema.parse({ email: '', web: 'ana.es', instagram: '@ana' })).toEqual({ email: null, web: 'https://ana.es/', instagram: 'ana' });
    expect(listingContactsSchema.safeParse({ email: 'ana@', web: '', instagram: '' }).success).toBe(false);
  });
});
