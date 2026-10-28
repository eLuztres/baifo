#!/usr/bin/env node
// Writes brand/addresses.json: the island's streets, venues and beaches from OpenStreetMap, which the event address
// field suggests while typing. Run it again now and then for new places.
//   npm run island-addresses
import { writeFile } from 'node:fs/promises';
import nextEnv from '@next/env';

nextEnv.loadEnvConfig(process.cwd(), false, { info() {}, error: console.error });

// ADDRESS_AREA (west,south,east,north), Fuerteventura by default.
const [west, south, east, north] = (process.env.ADDRESS_AREA || '-14.55,27.99,-13.80,28.78').split(',');
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const OUTPUT_FILE = 'brand/addresses.json';
const MAX_ATTEMPTS = 6;
const TOWN_TYPES = ['town', 'village', 'hamlet', 'suburb'];

const area = `(${south},${west},${north},${east})`;
const query = `[out:json][timeout:180];
(
  way["highway"]["name"]${area};
  nwr["name"]["amenity"]${area};
  nwr["name"]["tourism"]${area};
  nwr["name"]["leisure"]${area};
  nwr["name"]["natural"="beach"]${area};
  node["name"]["place"~"^(${TOWN_TYPES.join('|')})$"]${area};
);
out tags center;`;

// The public Overpass server is often full; it asks to retry with growing pauses.
async function askOverpass() {
  for (let attempt = 1; ; attempt++) {
    const response = await fetch(OVERPASS_URL, { method: 'POST', body: new URLSearchParams({ data: query }), headers: { 'User-Agent': 'baifo.es island-addresses' } });
    if (response.ok) return (await response.json()).elements;
    if (attempt === MAX_ATTEMPTS) throw new Error(`Overpass answered ${response.status}`);
    const pause = 15 * 2 ** attempt;
    console.log(`Overpass answered ${response.status}, trying again in ${pause}s`);
    await new Promise((resolve) => setTimeout(resolve, pause * 1000));
  }
}

const slugify = (name) =>
  name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
const round = (degrees) => Math.round(degrees * 10000) / 10000;
const distance = (a, b) => (a.lat - b.lat) ** 2 + ((a.lon - b.lon) * Math.cos((a.lat * Math.PI) / 180)) ** 2;

const elements = await askOverpass();
const point = (element) => element.center ?? { lat: element.lat, lon: element.lon };
const towns = elements.filter(({ tags }) => TOWN_TYPES.includes(tags.place)).map((element) => ({ name: element.tags.name, ...point(element) }));
const nearestTown = (at) => towns.reduce((nearest, town) => (distance(at, town) < distance(at, nearest) ? town : nearest)).name;

// "Beach Bar Waikiki, Calle Dr Arístides Hernández Morán 11, Corralejo": each part once, like the old map search.
const addresses = new Map();
for (const element of elements) {
  const at = point(element);
  const { name, 'addr:street': street, 'addr:housenumber': number } = element.tags;
  const parts = [name, street && [street, number].filter(Boolean).join(' '), nearestTown(at)];
  const label = parts.filter((part, index) => part && parts.indexOf(part) === index).join(', ');
  if (!addresses.has(label)) addresses.set(label, [label, round(at.lat), round(at.lon)]);
}

const data = {
  towns: Object.fromEntries(towns.map(({ name, lat, lon }) => [slugify(name), [round(lat), round(lon)]])),
  addresses: [...addresses.values()],
};
await writeFile(OUTPUT_FILE, JSON.stringify(data) + '\n');
console.log(`${OUTPUT_FILE}: ${towns.length} towns, ${addresses.size} addresses`);
