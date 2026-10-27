import type { Metadata } from 'next';
import Link from 'next/link';
import { Search, X } from 'lucide-react';
import FeedCard from '@/components/shared/product/feed-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getInStockRings, inPlaces } from '@/components/shared/home/in-stock-rings';
import { getStoreCategories, getSubcategories } from '@/lib/actions/category.actions';
import { BRAND } from '@/lib/brand';
import { localize, localizeProduct } from '@/lib/category';
import { APP_NAME, LISTING_TYPE_KEYS, LISTING_TYPE_PARAMS, LISTING_TYPES, listingTypeOf, NEW_LISTING_HOURS } from '@/lib/constants';
import { isShopToday } from '@/lib/event-date';
import { composeFeed } from '@/lib/feed';
import { feedCardLabels } from '@/lib/listing-labels';
import { getT } from '@/lib/i18n-server';
import { getShopPlaces, getVisitorPlaceIds } from '@/lib/places';
import ShowAllPlacesButton from '@/components/shared/show-all-places-button';
import { metaDescription, pageAlternates } from '@/lib/seo';
import { findMatchingListingIds } from '@/lib/search';
import { cn, timeAgo } from '@/lib/utils';
import styles from './explore.module.css';
import { LISTING_FROM_PRICE } from '@/lib/marketplace/config';

/** Every ninth tile is big, alternating sides, like an Instagram explore grid. */
const BLOCK_SIZE = 9;
/** Longer queries are cut; nobody types more to find a bike. */
const MAX_QUERY_LENGTH = 80;

interface ExplorePageProps {
  /** `tipo`: only one listing type (LISTING_TYPE_PARAMS); `c`: the category the visitor came from (its slug), whose listings
      open the feed; `sub`: one of its subcategories; `q`: the search text; `hoy`: only what happens today. */
  searchParams: Promise<{ tipo?: string; c?: string; sub?: string; q?: string; hoy?: string }>;
}

interface ExploreFilters {
  tipo?: string;
  c?: string;
  sub?: string;
  isToday?: boolean;
}

/** The feed's link with these filters and the search; `hoy` stays a bare flag (/explore?hoy). */
const exploreHref = ({ tipo, c, sub, isToday }: ExploreFilters, query = '') => {
  const params = new URLSearchParams({ ...(tipo && { tipo }), ...(c && { c }), ...(sub && { sub }), ...(query && { q: query }) }).toString();
  const search = [isToday && 'hoy', params].filter(Boolean).join('&');
  return search ? `/explore?${search}` : '/explore';
};

const chipClass = (isActive: boolean) =>
  cn(
    'shrink-0 rounded-full border px-4 py-2 text-sm transition-colors',
    isActive
      ? 'border-primary bg-primary text-primary-foreground'
      : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground',
  );

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return {
    title: t('EXPLORE_SEO_TITLE'),
    description: metaDescription(t('EXPLORE_SEO_DESCRIPTION', { shop: APP_NAME })),
    alternates: await pageAlternates('/explore'),
  };
}

// The Canary Islands' date: the mix changes once a day and stays put while the visitor scrolls and goes back.
const todayOnTheIsland = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Atlantic/Canary' });

/** The whole marketplace in one read-only feed: products and services mixed, the visitor's category first. */
export default async function ExplorePage({ searchParams }: ExplorePageProps) {
  const [{ tipo, c: focusSlug, sub: subSlug, q, hoy }, { t, locale }, categories, allListings, placeIds] = await Promise.all([
    searchParams,
    getT(),
    getStoreCategories(),
    getInStockRings(),
    getVisitorPlaceIds(),
  ]);
  const placedListings = inPlaces(allListings, placeIds);
  // The search looks through everything in the visitor's places; categories then narrow the results.
  const query = q?.trim().slice(0, MAX_QUERY_LENGTH) ?? '';
  const matchingIds = query ? await findMatchingListingIds(placedListings.map((listing) => listing.id), query) : null;
  const listings = matchingIds ? placedListings.filter((listing) => matchingIds.has(listing.id)) : placedListings;
  // "Hoy": live the moment, only what happens today (today's events and workshops).
  const todayListings = listings.filter((listing) => listing.startsAt && isShopToday(listing.startsAt));
  const isTodayOnly = hoy !== undefined && todayListings.length > 0;
  // Old links to the former Servicios, Busco and Eventos categories (?c=servicios) open that type.
  const type = listingTypeOf(tipo) ?? (categories.some((category) => category.slug === focusSlug) ? undefined : listingTypeOf(focusSlug));
  const filledTypes = LISTING_TYPES.filter((item) => listings.some((listing) => listing.type === item));
  const shownListings = isTodayOnly ? todayListings : type ? listings.filter((listing) => listing.type === type) : listings;
  const typeParam = !isTodayOnly && type ? LISTING_TYPE_PARAMS[type] : undefined;
  const livePlaces = (await getShopPlaces(locale)).filter((place) => place.isLive);
  // The town on each card only tells something once there's more than one.
  const placeName = new Map(livePlaces.length > 1 ? livePlaces.map((place) => [place.id, place.name]) : []);
  const filledCategories = categories.filter((category) => shownListings.some((listing) => listing.categoryIds.includes(category.id)));
  const focus = filledCategories.find((category) => category.slug === focusSlug);
  // Only subcategories that have listings.
  const subcategories = focus
    ? (await getSubcategories(focus.slug)).filter((item) => shownListings.some((listing) => listing.categoryIds.includes(item.id)))
    : [];
  const subcategory = subcategories.find((item) => item.slug === subSlug);
  const slugOf = new Map(categories.map((category) => [category.id, category.slug]));
  const feed = composeFeed(shownListings, subcategory?.id ?? focus?.id, `${todayOnTheIsland()}:${typeParam ?? ''}:${focus?.slug ?? ''}:${subcategory?.slug ?? ''}`);
  // Type and category combine: each chip changes its own filter and keeps the other one and the search.
  const filters: ExploreFilters = { tipo: typeParam, c: focus?.slug, isToday: isTodayOnly };
  const now = new Date();
  const whatsappUrl = BRAND.contact.showPhone ? BRAND.contact.sellWhatsappUrl(t('SELL_WHATSAPP_MESSAGE', { shop: APP_NAME })) : undefined;

  return (
    <div className='mx-auto w-full max-w-7xl space-y-5 px-4 py-6 sm:py-10'>
      <header className='space-y-2'>
        <div className='flex flex-wrap items-baseline gap-x-4 gap-y-1'>
          <h1 className='text-balance font-display text-4xl leading-tight sm:text-5xl'>{t('EXPLORE_TITLE')}</h1>
          <p className='text-sm tabular-nums text-muted-foreground'>{t('STORE_CATEGORY_RINGS', { count: feed.length })}</p>
        </div>
        <p className='max-w-2xl text-pretty text-muted-foreground'>{t('EXPLORE_INTRO', { shop: APP_NAME })}</p>
      </header>

      {/* Stays under the header while scrolling, so another category is always one tap away. */}
      <div className='sticky top-[calc(4rem+1px)] z-10 -mx-4 space-y-2 bg-background/85 px-4 py-3 backdrop-blur-md sm:top-[calc(5rem+1px)]'>
        <form action='/explore' role='search' className='relative'>
          <Search className='pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground' aria-hidden />
          <Input
            type='search'
            name='q'
            defaultValue={query}
            maxLength={MAX_QUERY_LENGTH}
            placeholder={t('EXPLORE_SEARCH_PLACEHOLDER')}
            aria-label={t('EXPLORE_SEARCH_LABEL')}
            className='h-12 rounded-full border-border bg-card pl-12 pr-28 text-base shadow-sm'
          />
          <Button type='submit' className='absolute right-1.5 top-1/2 h-9 -translate-y-1/2 rounded-full px-5'>
            {t('EXPLORE_SEARCH_SUBMIT')}
          </Button>
        </form>
        {query && (
          <p className='flex flex-wrap items-center gap-2 text-sm text-muted-foreground'>
            <span>{t('EXPLORE_SEARCH_RESULTS', { query })}</span>
            <Link
              href={exploreHref({ ...filters, sub: subcategory?.slug })}
              className='inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1 text-foreground transition-colors hover:border-primary/40'
            >
              <X className='size-3.5' aria-hidden /> {t('EXPLORE_SEARCH_CLEAR')}
            </Link>
          </p>
        )}
        <nav aria-label={t('EXPLORE_TYPE_FILTER')} className='-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]'>
          <Link
            href={exploreHref({ c: focus?.slug }, query)}
            aria-current={!typeParam && !isTodayOnly ? 'page' : undefined}
            className={chipClass(!typeParam && !isTodayOnly)}
          >
            {t('EXPLORE_ALL')}
          </Link>
          {filledTypes.map((item) => (
            <Link
              key={item}
              href={exploreHref({ c: focus?.slug, tipo: LISTING_TYPE_PARAMS[item] }, query)}
              aria-current={item === type && !isTodayOnly ? 'page' : undefined}
              className={chipClass(item === type && !isTodayOnly)}
            >
              {t(LISTING_TYPE_KEYS[item])}
            </Link>
          ))}
          {todayListings.length > 0 && (
            <Link href={exploreHref({ c: focus?.slug, isToday: true }, query)} aria-current={isTodayOnly ? 'page' : undefined} className={chipClass(isTodayOnly)}>
              {t('EXPLORE_TODAY')}
            </Link>
          )}
        </nav>
        <nav aria-label={t('CATEGORY_ALL')} className='-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]'>
          <Link href={exploreHref({ ...filters, c: undefined }, query)} aria-current={!focus ? 'page' : undefined} className={chipClass(!focus)}>
            {t('CATEGORY_ALL')}
          </Link>
          {filledCategories.map((category) => (
            <Link
              key={category.id}
              href={exploreHref({ ...filters, c: category.slug }, query)}
              aria-current={category.id === focus?.id && !subcategory ? 'page' : undefined}
              className={chipClass(category.id === focus?.id)}
            >
              {localize(category.name, locale)}
            </Link>
          ))}
        </nav>
        {focus && subcategories.length > 0 && (
          <nav aria-label={localize(focus.name, locale)} className='-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]'>
            <Link href={exploreHref(filters, query)} aria-current={!subcategory ? 'page' : undefined} className={chipClass(!subcategory)}>
              {t('CATEGORY_SUB_ALL')}
            </Link>
            {subcategories.map((item) => (
              <Link
                key={item.id}
                href={exploreHref({ ...filters, sub: item.slug }, query)}
                aria-current={item.id === subcategory?.id ? 'page' : undefined}
                className={chipClass(item.id === subcategory?.id)}
              >
                {localize(item.name, locale)}
              </Link>
            ))}
          </nav>
        )}
      </div>

      {feed.length === 0 && query ? (
        <div className='space-y-4 py-16 text-center'>
          <p className='text-muted-foreground'>{t('EXPLORE_SEARCH_EMPTY', { query })}</p>
          <Button asChild variant='outline' className='rounded-full'>
            <Link href='/explore'>{t('EXPLORE_SEARCH_CLEAR')}</Link>
          </Button>
        </div>
      ) : feed.length === 0 && placedListings.length < allListings.length ? (
        <div className='space-y-4 py-16 text-center'>
          <p className='text-muted-foreground'>{t('PLACES_EMPTY')}</p>
          <ShowAllPlacesButton slugs={livePlaces.map((place) => place.slug)} label={t('PLACES_SHOW_ALL')} />
        </div>
      ) : feed.length === 0 ? (
        <p className='py-16 text-center text-muted-foreground'>{t('STORE_EMPTY')}</p>
      ) : (
        <ul className={styles.grid}>
          {feed.map((listing, index) => {
            const isLarge = index % BLOCK_SIZE === 0;
            const isRight = Math.floor(index / BLOCK_SIZE) % 2 === 1;
            // The listing's own category, so its page leads back to a feed that opens with similar things.
            const categorySlug = listing.categoryIds.map((id) => slugOf.get(id)).find(Boolean);
            // A listing's product is created when it goes live, so createdAt is its publish time.
            const isNew = now.getTime() - listing.createdAt.getTime() < NEW_LISTING_HOURS * 60 * 60 * 1000;
            return (
              <li key={listing.id} className={cn(styles.tile, isLarge && styles.large, isLarge && isRight && styles.right)}>
                <FeedCard
                  href={categorySlug ? `/product/${listing.slug}?c=${categorySlug}` : `/product/${listing.slug}`}
                  name={localizeProduct(listing, locale).name}
                  images={listing.images}
                  price={listing.price}
                  priceMax={listing.priceMax}
                  {...feedCardLabels(listing, t, locale, now)}
                  note={listing.isIllustrative ? t('PRODUCT_ILLUSTRATIVE') : undefined}
                  isReserved={listing.isReserved}
                  reservedLabel={t('RESERVE_BADGE')}
                  newLabel={isNew ? t('EXPLORE_NEW_BADGE') : undefined}
                  listedAgo={[timeAgo(listing.createdAt, locale, now), listing.placeId && placeName.get(listing.placeId)].filter(Boolean).join(' · ')}
                  isLarge={isLarge}
                />
              </li>
            );
          })}
        </ul>
      )}

      {/* A clear end instead of a void: browsers who found nothing are invited to sell or offer something. */}
      {feed.length > 0 && (
        <div className='flex flex-col items-center gap-3 py-12 text-center sm:py-16'>
          <span aria-hidden='true' className='h-px w-16 bg-gradient-to-r from-transparent via-primary to-transparent' />
          <p className='text-balance font-display text-2xl sm:text-3xl'>{t('EXPLORE_END_TITLE')}</p>
          <p className='max-w-md text-pretty text-muted-foreground'>{t('EXPLORE_END_TEXT', { shop: APP_NAME })}</p>
          {whatsappUrl && (
            <Button asChild size='lg' className='mt-2 rounded-full'>
              <a href={whatsappUrl} target='_blank' rel='noopener noreferrer'>
                {t('HOME_HERO_ORDER', { price: LISTING_FROM_PRICE })}
              </a>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
