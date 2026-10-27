import { prisma } from '@/db/prisma';
import { ADDRESS_AREA } from './config';

// Photon is OpenStreetMap's search made for typing along; Nominatim's public server doesn't allow that.
const PHOTON_URL = 'https://photon.komoot.io/api/';
const PHOTON_LANGUAGES = ['en', 'de', 'fr'];
const MAX_SUGGESTIONS = 6;

/** The properties of a Photon result that make up an address. */
export interface PhotonPlace {
  name?: string;
  street?: string;
  housenumber?: string;
  district?: string;
  locality?: string;
  city?: string;
}

/** "Beach Bar Waikiki, Calle Dr Arístides Hernández Morán 11, Corralejo, La Oliva": each part once. */
export function formatPlace({ name, street, housenumber, district, locality, city }: PhotonPlace) {
  const parts = [name, street && [street, housenumber].filter(Boolean).join(' '), district ?? locality, city];
  return parts.filter((part, index): part is string => Boolean(part) && parts.indexOf(part) === index).join(', ');
}

async function searchOpenStreetMap(query: string, locale: string) {
  const params = new URLSearchParams({ q: query, limit: String(MAX_SUGGESTIONS) });
  if (ADDRESS_AREA) params.set('bbox', ADDRESS_AREA);
  if (PHOTON_LANGUAGES.includes(locale)) params.set('lang', locale);
  const response = await fetch(`${PHOTON_URL}?${params}`, { signal: AbortSignal.timeout(4000) });
  if (!response.ok) throw new Error(`Photon answered ${response.status}`);
  const { features } = (await response.json()) as { features: { properties: PhotonPlace }[] };
  return features.map(({ properties }) => formatPlace(properties));
}

// Events come back to the same venues, so their addresses are the first suggestions.
async function searchEarlierAddresses(query: string) {
  const products = await prisma.product.findMany({
    where: { type: 'EVENT', address: { contains: query, mode: 'insensitive' } },
    select: { address: true },
    distinct: ['address'],
    orderBy: { createdAt: 'desc' },
    take: MAX_SUGGESTIONS,
  });
  return products.flatMap(({ address }) => address ?? []);
}

/** Addresses for what was typed: earlier events' first, then OpenStreetMap's. The map search may fail; then only the earlier ones. */
export async function suggestAddresses(query: string, locale: string) {
  const [earlier, found] = await Promise.all([
    searchEarlierAddresses(query),
    searchOpenStreetMap(query, locale).catch((error) => {
      console.error('Address search failed', error);
      return [];
    }),
  ]);
  return [...new Set([...earlier, ...found])].filter(Boolean).slice(0, MAX_SUGGESTIONS);
}
