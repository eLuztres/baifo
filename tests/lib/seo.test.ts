import { breadcrumbJsonLd, eventJsonLd, listingJsonLd, listingMetaDescription, localizedPath, metaDescription, jsonLd } from '@/lib/seo';

jest.mock('next/headers', () => ({ headers: jest.fn(), cookies: jest.fn() }));

const listing = {
  name: 'Bici de paseo',
  description: 'Bici turquesa',
  images: ['https://utfs.io/f/bike.jpg'],
  category: 'Bicis y motor',
  path: '/product/bici',
  isService: false,
  price: '120',
  condition: 'good',
  isAvailable: true,
};

describe('metaDescription', () => {
  it('keeps a short text as it is, on one line', () => {
    expect(metaDescription('Bici  de paseo\nturquesa')).toBe('Bici de paseo turquesa');
  });

  it('cuts a long text at a word boundary', () => {
    const text = metaDescription('palabra '.repeat(40));

    expect(text.length).toBeLessThanOrEqual(156);
    expect(text).toMatch(/palabra…$/);
  });
});

describe('listingMetaDescription', () => {
  it('always keeps the closing line and stays within a snippet', () => {
    const suffix = 'Anuncio en Fuerteventura.';
    const text = listingMetaDescription('palabra '.repeat(40), suffix);

    expect(text.endsWith(suffix)).toBe(true);
    expect(text.length).toBeLessThanOrEqual(156);
  });

  it('is only the closing line for a listing without a text', () => {
    expect(listingMetaDescription('', 'Fin.')).toBe('Fin.');
  });
});

describe('localizedPath', () => {
  it('adds the language after a query the path already has', () => {
    expect(localizedPath('/explore?categoria=deporte', 'zz')).toBe('/explore?categoria=deporte&lang=zz');
    expect(localizedPath('/explore', 'zz')).toBe('/explore?lang=zz');
  });
});

describe('eventJsonLd', () => {
  it('describes an event with its date and place', () => {
    const event = { name: 'Taller', description: 'Cerámica', images: [], path: '/product/taller', startsAt: new Date('2026-12-01T18:00:00Z'), address: 'Lajares', price: '35' };

    expect(eventJsonLd(event)).toMatchObject({
      '@type': 'Event',
      startDate: '2026-12-01T18:00:00.000Z',
      location: { name: 'Lajares' },
      offers: { price: '35.00' },
    });
  });
});

describe('breadcrumbJsonLd', () => {
  it('numbers the steps from one', () => {
    const { itemListElement } = breadcrumbJsonLd([{ name: 'Anuncios', path: '/explore' }, { name: 'Bici', path: '/product/bici' }]);

    expect(itemListElement[1]).toMatchObject({ position: 2, name: 'Bici' });
    expect(itemListElement[1].item.endsWith('/product/bici')).toBe(true);
  });
});

describe('listingJsonLd', () => {
  it('describes a used item with its price as a Product offer', () => {
    expect(listingJsonLd(listing)).toMatchObject({
      '@type': 'Product',
      name: 'Bici de paseo',
      offers: {
        price: '120.00',
        priceCurrency: 'EUR',
        itemCondition: 'https://schema.org/UsedCondition',
        availability: 'https://schema.org/InStock',
      },
    });
  });

  it('leaves the offer out when there is no price', () => {
    expect(listingJsonLd({ ...listing, price: '0' }).offers).toBeUndefined();
  });

  it('describes a service as a Service, without price', () => {
    expect(listingJsonLd({ ...listing, isService: true })).toMatchObject({ '@type': 'Service', name: 'Bici de paseo' });
  });
});

describe('jsonLd', () => {
  it('escapes < so a text cannot close the script tag', () => {
    expect(jsonLd({ name: '</script><script>' })).not.toContain('<');
  });
});
