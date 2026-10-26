import { inPlaces } from '@/components/shared/home/in-stock-rings';
import { chosenPlaces, parsePlaceSlugs } from '@/lib/places-core';

jest.mock('@/db/prisma', () => ({ prisma: {} }));

const PLACES = [
  { slug: 'corralejo', isLive: true },
  { slug: 'el-cotillo', isLive: true },
  { slug: 'morro-jable', isLive: false },
];
const slugsOf = (places: { slug: string }[]) => places.map((place) => place.slug);

describe('the visitor’s places', () => {
  it('reads the saved slugs, ignoring blanks', () => {
    expect(parsePlaceSlugs(' corralejo, ,el-cotillo ')).toEqual(['corralejo', 'el-cotillo']);
    expect(parsePlaceSlugs(undefined)).toEqual([]);
  });

  it('shows every live place when nothing is saved', () => {
    expect(slugsOf(chosenPlaces(PLACES, []))).toEqual(['corralejo', 'el-cotillo']);
  });

  it('keeps only the chosen places that are live', () => {
    expect(slugsOf(chosenPlaces(PLACES, ['el-cotillo', 'morro-jable']))).toEqual(['el-cotillo']);
  });

  it('falls back to every live place when none of the saved ones is live (anymore)', () => {
    expect(slugsOf(chosenPlaces(PLACES, ['morro-jable', 'gone']))).toEqual(['corralejo', 'el-cotillo']);
  });
});

describe('inPlaces', () => {
  const rings = [
    { slug: 'board', placeId: 'corralejo' },
    { slug: 'bike', placeId: 'el-cotillo' },
    { slug: 'old', placeId: null },
  ];

  it('keeps the visitor’s places and anything without a place', () => {
    expect(slugsOf(inPlaces(rings, ['corralejo']))).toEqual(['board', 'old']);
  });

  it('filters nothing in a shop without places', () => {
    expect(inPlaces(rings, undefined)).toHaveLength(3);
  });
});
