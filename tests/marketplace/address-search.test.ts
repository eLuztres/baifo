import { prisma } from '@/db/prisma';
import { addressesNear, loadAddresses } from '@/lib/marketplace/address-search';
import { matchAddresses } from '@/lib/marketplace/match-addresses';

jest.mock('@/db/prisma', () => ({ prisma: { product: { findMany: jest.fn() } } }));
jest.mock('@/brand/addresses.json', () => ({
  towns: { corralejo: [28.73, -13.867], 'morro-jable': [28.05, -14.35] },
  addresses: [
    ['Calle Lejos, Lajares', 28.677, -13.94],
    ['Beach Bar Waikiki, Corralejo', 28.734, -13.866],
    ['Playa del Matorral, Morro Jable', 28.049, -14.33],
  ],
}));

const findMany = prisma.product.findMany as jest.Mock;

describe('addressesNear', () => {
  it('keeps the town and its surroundings, nearest first', () => {
    expect(addressesNear('corralejo')).toEqual(['Beach Bar Waikiki, Corralejo', 'Calle Lejos, Lajares']);
  });

  it('offers the whole island for a place that is no known town', () => {
    expect(addressesNear('nowhere')).toHaveLength(3);
    expect(addressesNear(undefined)).toHaveLength(3);
  });
});

describe('loadAddresses', () => {
  it('puts earlier event venues first, without doubles', async () => {
    findMany.mockResolvedValue([{ address: 'Beach Bar Waikiki, Corralejo' }, { address: 'Centro Cultural, Lajares' }]);
    expect(await loadAddresses('corralejo')).toEqual(['Beach Bar Waikiki, Corralejo', 'Centro Cultural, Lajares', 'Calle Lejos, Lajares']);
  });
});

describe('matchAddresses', () => {
  const list = ['Calle Arístides Hernández 11, Corralejo', 'Plaza Patricio Calero, Corralejo', 'Playa del Moro, Corralejo'];

  it('finds every typed word, ignoring accents and case', () => {
    expect(matchAddresses(list, 'aristides corr', 6)).toEqual(['Calle Arístides Hernández 11, Corralejo']);
    expect(matchAddresses(list, 'PLA', 6)).toEqual(['Plaza Patricio Calero, Corralejo', 'Playa del Moro, Corralejo']);
  });

  it('stops at the limit and finds nothing for an empty query', () => {
    expect(matchAddresses(list, 'corralejo', 2)).toHaveLength(2);
    expect(matchAddresses(list, '  ', 6)).toEqual([]);
  });
});
