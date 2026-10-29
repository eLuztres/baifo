import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import ProductMedia from '@/components/ProductMedia';
import { FEED_COVER_TRANSITION } from '@/components/shared/product/feed-cover';
import FeedCard from '@/components/shared/product/feed-card';
import { Button } from '@/components/ui/button';
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
import ExploreChips, { type ExploreChip } from '@/components/shared/explore-chips';
import ExploreSearch from '@/components/shared/explore-search';
import ExploreStories from '@/components/shared/explore-stories';
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

/** The home page's category ring, turned to this category (category-ring.tsx reads `category`). */
const ringHref = (slug?: string) => (slug ? `/?category=${slug}#showroom` : '/#showroom');

/** The feed's link with these filters and the search; `hoy` stays a bare flag (/explore?hoy). */
const exploreHref = ({ tipo, c, sub, isToday }: ExploreFilters, query = '') => {
  const params = new URLSearchParams({ ...(tipo && { tipo }), ...(c && { c }), ...(sub && { sub }), ...(query && { q: query }) }).toString();
  const search = [isToday && 'hoy', params].filter(Boolean).join('&');
  return search ? `/explore?${search}` : '/explore';
};

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
  // Coming from the ring the feed opens inside that category: all of it first, then the rest of the island mixed.
  const focusId = subcategory?.id ?? focus?.id;
  const focusFeed = focusId ? shownListings.filter((listing) => listing.categoryIds.includes(focusId)) : [];
  const restFeed = composeFeed(
    shownListings.filter((listing) => !focusFeed.includes(listing)),
    undefined,
    `${todayOnTheIsland()}:${typeParam ?? ''}:${focus?.slug ?? ''}:${subcategory?.slug ?? ''}`
  );
  const feed = [...focusFeed, ...restFeed];
  // The ring's categories in its order; the way back turns it to the one after this.
  const ringCategories = categories.filter((category) => placedListings.some((listing) => listing.categoryIds.includes(category.id)));
  const focusRingIndex = ringCategories.findIndex((category) => category.id === focus?.id);
  const nextCategory = focusRingIndex >= 0 && ringCategories.length > 1 ? ringCategories[(focusRingIndex + 1) % ringCategories.length] : undefined;
  const focusCover = focus && (focus.image ?? focusFeed[0]?.image);
  // Type and category combine: each chip changes its own filter and keeps the other one and the search.
  const filters: ExploreFilters = { tipo: typeParam, c: focus?.slug, isToday: isTodayOnly };
  const isFiltered = Boolean(typeParam || focus || isTodayOnly);
  // One row of plain chips: "Todo" really clears everything, a chosen chip is tapped again to drop just that one.
  const chips: ExploreChip[] = [
    { key: 'all', label: t('EXPLORE_ALL'), href: '/explore', isActive: !isFiltered && !query },
    ...(todayListings.length > 0
      ? [{ key: 'today', label: t('EXPLORE_TODAY'), href: exploreHref({ c: focus?.slug, isToday: !isTodayOnly }, query), isActive: isTodayOnly }]
      : []),
    // The chosen type stays visible even when nothing matches it, so it can always be undone.
    ...(filledTypes.length > 1 || typeParam
      ? LISTING_TYPES.filter((item) => filledTypes.includes(item) || (item === type && typeParam)).map((item) => {
          const isActive = item === type && !isTodayOnly;
          return { key: item, label: t(LISTING_TYPE_KEYS[item]), href: exploreHref({ c: focus?.slug, tipo: isActive ? undefined : LISTING_TYPE_PARAMS[item] }, query), isActive };
        })
      : []),
    ...filledCategories.map((category) => {
      const isActive = category.id === focus?.id;
      return { key: category.id, label: localize(category.name, locale), href: exploreHref({ ...filters, c: isActive ? undefined : category.slug }, query), isActive };
    }),
  ];
  const now = new Date();
  const whatsappUrl = BRAND.contact.showPhone ? BRAND.contact.sellWhatsappUrl(t('SELL_WHATSAPP_MESSAGE', { shop: APP_NAME })) : undefined;

  // Every ninth tile is big; each part of the feed (the category, then the rest) starts its own mosaic.
  const renderTiles = (tiles: typeof feed) => (
    <ul className={styles.grid}>
      {tiles.map((listing, index) => {
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
  );

  return (
    // data-feed-page: the ring's morph waits for this page (use-open-feed.ts).
    <div className='mx-auto w-full max-w-7xl space-y-5 px-4 py-6 sm:py-10' data-feed-page=''>
      {focus ? (
        // Inside a category: its ring card, small, so the visitor sees where they came in; the ring's front card grows into it.
        <header className='flex items-center gap-4 sm:gap-6'>
          {focusCover && (
            <div
              className='relative aspect-[3/4] w-20 shrink-0 overflow-hidden rounded-2xl border border-primary/40 shadow-lg sm:w-28'
              style={{ viewTransitionName: FEED_COVER_TRANSITION }}
            >
              <ProductMedia src={focusCover} alt='' fill sizes='7rem' />
            </div>
          )}
          <div className='min-w-0 space-y-1'>
            {/* Long one-word names (Musikinstrumente) break instead of running off a phone. */}
            <h1 className='hyphens-auto text-balance break-words font-display text-3xl leading-tight sm:text-5xl'>{localize(focus.name, locale)}</h1>
            <p className='text-sm tabular-nums text-muted-foreground'>{t('STORE_CATEGORY_RINGS', { count: focusFeed.length })}</p>
            <Link href={ringHref(focus.slug)} className='inline-flex items-center gap-0.5 text-sm font-medium text-primary underline-offset-4 hover:underline'>
              <ChevronLeft className='size-4' aria-hidden /> {t('EXPLORE_TO_RING')}
            </Link>
          </div>
        </header>
      ) : (
        <header className='space-y-2'>
          <div className='flex flex-wrap items-baseline gap-x-4 gap-y-1'>
            <h1 className='text-balance font-display text-4xl leading-tight sm:text-5xl'>{t('EXPLORE_TITLE')}</h1>
            <p className='text-sm tabular-nums text-muted-foreground'>{t('STORE_CATEGORY_RINGS', { count: feed.length })}</p>
          </div>
          <p className='max-w-2xl text-pretty text-muted-foreground'>{t('EXPLORE_INTRO', { shop: APP_NAME })}</p>
        </header>
      )}

      {/* Stays under the header while scrolling: every category and type is in sight and one tap away. */}
      <div className='sticky top-[calc(4rem+1px)] z-10 -mx-4 space-y-2 bg-background/85 px-4 py-3 backdrop-blur-md sm:top-[calc(5rem+1px)]'>
        <ExploreSearch
          placeholder={t('EXPLORE_SEARCH_PLACEHOLDER')}
          label={t('EXPLORE_SEARCH_LABEL')}
          clearLabel={t('EXPLORE_SEARCH_CLEAR')}
          maxLength={MAX_QUERY_LENGTH}
        />
        {query && <p className='px-1 text-sm text-muted-foreground'>{t('EXPLORE_SEARCH_RESULTS', { query })}</p>}
        <ExploreStories
          label={t('EXPLORE_CATEGORY_BUTTON')}
          unseenSince={new Date(now.getTime() - NEW_LISTING_HOURS * 60 * 60 * 1000).toISOString()}
          items={[
            { key: 'all', label: t('EXPLORE_ALL'), href: exploreHref({ ...filters, c: undefined }, query), isActive: !focus },
            ...filledCategories.map((category) => {
              const inCategory = shownListings.filter((listing) => listing.categoryIds.includes(category.id));
              return {
                key: category.slug,
                label: localize(category.name, locale),
                href: exploreHref({ ...filters, c: category.slug }, query),
                image: category.image ?? inCategory[0]?.image,
                isActive: category.id === focus?.id,
                newestAt: inCategory.reduce<Date | undefined>((newest, { createdAt }) => (!newest || createdAt > newest ? createdAt : newest), undefined)?.toISOString(),
              };
            }),
          ]}
        />
        <ExploreChips label={t('EXPLORE_TYPE_FILTER')} chips={chips} />
      </div>

      {feed.length === 0 && query ? (
        <div className='space-y-4 py-16 text-center'>
          <p className='text-muted-foreground'>{t('EXPLORE_SEARCH_EMPTY', { query })}</p>
          {/* Nothing inside the chosen chips is no dead end: the same words over everything are one tap away. */}
          <div className='flex flex-wrap justify-center gap-2'>
            {isFiltered && (
              <Button asChild className='rounded-full'>
                <Link href={exploreHref({}, query)}>{t('EXPLORE_SEARCH_EVERYWHERE', { query })}</Link>
              </Button>
            )}
            <Button asChild variant='outline' className='rounded-full'>
              <Link href='/explore'>{t('EXPLORE_SEARCH_CLEAR')}</Link>
            </Button>
          </div>
        </div>
      ) : feed.length === 0 && placedListings.length < allListings.length ? (
        <div className='space-y-4 py-16 text-center'>
          <p className='text-muted-foreground'>{t('PLACES_EMPTY')}</p>
          <ShowAllPlacesButton slugs={livePlaces.map((place) => place.slug)} label={t('PLACES_SHOW_ALL')} />
        </div>
      ) : feed.length === 0 ? (
        <p className='py-16 text-center text-muted-foreground'>{t('STORE_EMPTY')}</p>
      ) : (
        <>
          {renderTiles(focusFeed)}
          {/* The category ends here: said so, with the way back to the ring, before the rest of the island. */}
          {focus && focusFeed.length > 0 && restFeed.length > 0 && (
            <div className='flex flex-col items-center gap-2 py-10 text-center'>
              <span aria-hidden='true' className='h-px w-16 bg-gradient-to-r from-transparent via-primary to-transparent' />
              <p className='text-balance font-display text-2xl sm:text-3xl'>{t('EXPLORE_CATEGORY_DONE', { category: localize(focus.name, locale) })}</p>
              <p className='text-pretty text-muted-foreground'>{t('EXPLORE_CATEGORY_REST')}</p>
              {nextCategory && (
                <Link href={ringHref(nextCategory.slug)} className='mt-1 inline-flex items-center gap-0.5 text-sm font-medium text-primary underline-offset-4 hover:underline'>
                  {t('EXPLORE_NEXT_CATEGORY', { category: localize(nextCategory.name, locale) })} <ChevronRight className='size-4' aria-hidden />
                </Link>
              )}
            </div>
          )}
          {renderTiles(restFeed)}
        </>
      )}

      {/* A clear end instead of a void: browsers who found nothing are invited to sell or offer something. */}
      {feed.length > 0 && (
        <div className='flex flex-col items-center gap-3 py-12 text-center sm:py-16'>
          <span aria-hidden='true' className='h-px w-16 bg-gradient-to-r from-transparent via-primary to-transparent' />
          <p className='text-balance font-display text-2xl sm:text-3xl'>{t('EXPLORE_END_TITLE')}</p>
          <p className='max-w-md text-pretty text-muted-foreground'>{t('EXPLORE_END_TEXT', { shop: APP_NAME })}</p>
          {/* The end leads back to the ring, the visit's high point, turned to the next category. */}
          <Button asChild variant='outline' size='lg' className='mt-2 rounded-full'>
            <Link href={ringHref(nextCategory?.slug)}>
              {nextCategory ? t('EXPLORE_NEXT_CATEGORY', { category: localize(nextCategory.name, locale) }) : t('EXPLORE_TO_RING')}
              <ChevronRight aria-hidden />
            </Link>
          </Button>
          {whatsappUrl && (
            <Button asChild size='lg' className='rounded-full'>
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
