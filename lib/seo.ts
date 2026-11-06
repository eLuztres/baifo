import { headers } from 'next/headers';
import { BRAND, absoluteUrl } from '@/lib/brand';
import { CURRENCY } from '@/lib/constants/currency';
import { ANY_CONDITION, SERVER_URL, SERVICE_AREA } from '@/lib/constants';
import { URL_LOCALE_HEADER } from '@/lib/i18n-core';
import { getEnabledLocales, getShopLocale } from '@/lib/i18n-server';

const DESCRIPTION_LENGTH = 155;

/** `path` in one language: the shop's own language needs no `?lang=`. */
export function localizedPath(path: string, locale: string) {
  return locale === getShopLocale() ? path : `${path}${path.includes('?') ? '&' : '?'}lang=${locale}`;
}

/** Every language of a page, for hreflang in the head and in the sitemap. */
export function languageAlternates(path: string): Record<string, string> {
  const languages: Record<string, string> = Object.fromEntries(
    getEnabledLocales().map((locale) => [locale, localizedPath(path, locale)])
  );
  return { ...languages, 'x-default': path };
}

/** Canonical URL and hreflang of a page; the canonical keeps the language the URL asked for and drops every other parameter. */
export async function pageAlternates(path: string): Promise<{ canonical: string; languages: Record<string, string> }> {
  const urlLocale = (await headers()).get(URL_LOCALE_HEADER);
  const isEnabled = getEnabledLocales().some((locale) => locale === urlLocale);
  return {
    canonical: urlLocale && isEnabled ? localizedPath(path, urlLocale) : path,
    languages: languageAlternates(path),
  };
}

/** A text cut to a search-result snippet, at a word boundary. */
export function metaDescription(text: string, maxLength = DESCRIPTION_LENGTH) {
  const flat = text.replace(/\s+/g, ' ').trim();
  if (flat.length <= maxLength) return flat;
  const cut = flat.lastIndexOf(' ', maxLength - 1);
  return `${flat.slice(0, cut > 0 ? cut : maxLength - 1).replace(/[\s,.;:–-]+$/, '')}…`;
}

/** A listing's snippet: its own words first, then the closing line that always fits. */
export function listingMetaDescription(text: string, suffix: string) {
  const room = suffix ? DESCRIPTION_LENGTH - suffix.length - 1 : DESCRIPTION_LENGTH;
  return [metaDescription(text, room), suffix].filter(Boolean).join(' ');
}

/** schema.org data as a <script> body; `<` is escaped so a listing's text can't close the tag. */
export function jsonLd(data: object) {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

const SCHEMA = 'https://schema.org';

/** The shop and its website, for Google's knowledge panel and site name. */
export function shopJsonLd(description: string) {
  const { contact } = BRAND;
  return {
    '@context': SCHEMA,
    '@graph': [
      {
        '@type': 'Organization',
        name: BRAND.name,
        url: SERVER_URL,
        logo: absoluteUrl(BRAND.logo, SERVER_URL),
        description,
        email: contact.showEmail ? contact.email : undefined,
        sameAs: contact.instagramUrl ? [contact.instagramUrl] : undefined,
        areaServed: SERVICE_AREA || undefined,
      },
      { '@type': 'WebSite', name: BRAND.name, url: SERVER_URL, inLanguage: getEnabledLocales() },
    ],
  };
}

interface ListingSchema {
  name: string;
  description: string;
  images: string[];
  path: string;
  isService: boolean;
  /** Missing when the shop shows no prices; 0 means none was given. */
  price?: string;
  condition: string | null;
  isAvailable: boolean;
}

/** A listing as a schema.org Product with its offer (Google's product snippet), or a Service. */
export function listingJsonLd({ name, description, images, path, isService, price, condition, isAvailable }: ListingSchema) {
  const url = `${SERVER_URL}${path}`;
  const image = images.map((src) => absoluteUrl(src, SERVER_URL));
  if (isService) {
    return { '@context': SCHEMA, '@type': 'Service', name, description, image, url, areaServed: SERVICE_AREA || undefined };
  }
  const hasPrice = price !== undefined && Number(price) > 0;
  return {
    '@context': SCHEMA,
    '@type': 'Product',
    name,
    description,
    image,
    url,
    offers: hasPrice
      ? {
          '@type': 'Offer',
          url,
          price: Number(price).toFixed(2),
          priceCurrency: CURRENCY,
          // Anything but "new" is second-hand.
          itemCondition: condition && condition !== ANY_CONDITION ? `${SCHEMA}/${condition === 'new' ? 'NewCondition' : 'UsedCondition'}` : undefined,
          availability: `${SCHEMA}/${isAvailable ? 'InStock' : 'SoldOut'}`,
        }
      : undefined,
  };
}

interface EventSchema {
  name: string;
  description: string;
  images: string[];
  path: string;
  startsAt: Date;
  address: string | null;
  /** Missing when the shop shows no prices; 0 means free or none given. */
  price?: string;
}

/** An event with its date and place, which Google can show as an event result. */
export function eventJsonLd({ name, description, images, path, startsAt, address, price }: EventSchema) {
  const url = `${SERVER_URL}${path}`;
  const place = address || SERVICE_AREA;
  return {
    '@context': SCHEMA,
    '@type': 'Event',
    name,
    description,
    image: images.map((src) => absoluteUrl(src, SERVER_URL)),
    url,
    startDate: startsAt.toISOString(),
    eventStatus: `${SCHEMA}/EventScheduled`,
    eventAttendanceMode: `${SCHEMA}/OfflineEventAttendanceMode`,
    location: place ? { '@type': 'Place', name: place, address: place } : undefined,
    offers:
      price !== undefined && Number(price) > 0
        ? { '@type': 'Offer', url, price: Number(price).toFixed(2), priceCurrency: CURRENCY, availability: `${SCHEMA}/InStock` }
        : undefined,
  };
}

/** The way to a page, as Google shows it above the result. Each step is its name and its path. */
export function breadcrumbJsonLd(steps: { name: string; path: string }[]) {
  return {
    '@context': SCHEMA,
    '@type': 'BreadcrumbList',
    itemListElement: steps.map((step, index) => ({ '@type': 'ListItem', position: index + 1, name: step.name, item: `${SERVER_URL}${step.path}` })),
  };
}
