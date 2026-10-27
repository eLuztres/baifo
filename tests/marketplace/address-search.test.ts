import { prisma } from '@/db/prisma';
import { formatPlace, suggestAddresses } from '@/lib/marketplace/address-search';

jest.mock('@/db/prisma', () => ({ prisma: { product: { findMany: jest.fn() } } }));

const findMany = prisma.product.findMany as jest.Mock;
const photonAnswer = (places: object[]) =>
  jest.fn(async () => ({ ok: true, json: async () => ({ features: places.map((properties) => ({ properties })) }) }));

describe('formatPlace', () => {
  it('joins name, street with number, district and town', () => {
    expect(formatPlace({ name: 'Beach Bar Waikiki', street: 'Calle Dr Arístides', housenumber: '11', district: 'Corralejo', city: 'La Oliva' })).toBe(
      'Beach Bar Waikiki, Calle Dr Arístides 11, Corralejo, La Oliva'
    );
  });

  it('names each part once and skips missing ones', () => {
    expect(formatPlace({ name: 'Corralejo', district: 'Corralejo', city: 'La Oliva' })).toBe('Corralejo, La Oliva');
  });
});

describe('suggestAddresses', () => {
  afterEach(() => jest.restoreAllMocks());

  it('puts earlier event venues first, then the map search, without doubles', async () => {
    findMany.mockResolvedValue([{ address: 'Waikiki Beach, Corralejo, La Oliva' }]);
    global.fetch = photonAnswer([{ name: 'Waikiki Beach', district: 'Corralejo', city: 'La Oliva' }, { name: 'Beach Bar Waikiki', city: 'La Oliva' }]) as never;

    expect(await suggestAddresses('waikiki', 'es')).toEqual(['Waikiki Beach, Corralejo, La Oliva', 'Beach Bar Waikiki, La Oliva']);
    const url = String((global.fetch as jest.Mock).mock.calls[0][0]);
    expect(url).toContain('bbox=');
    expect(url).not.toContain('lang=');
  });

  it('still offers earlier venues when the map search fails', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    findMany.mockResolvedValue([{ address: 'Centro Cultural, Lajares' }]);
    global.fetch = jest.fn(async () => ({ ok: false, status: 503 })) as never;

    expect(await suggestAddresses('lajares', 'en')).toEqual(['Centro Cultural, Lajares']);
  });
});
