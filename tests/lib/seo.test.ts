import { listingJsonLd, metaDescription, jsonLd } from '@/lib/seo';

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
