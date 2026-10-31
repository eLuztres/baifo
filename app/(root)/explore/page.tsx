import type { Metadata } from 'next';
import FeedCard from '@/components/shared/product/feed-card';
import { Button } from '@/components/ui/button';
import { getInStockRings, inPlaces } from '@/components/shared/home/in-stock-rings';
import { getStoreCategories } from '@/lib/actions/category.actions';
import { BRAND } from '@/lib/brand';
import { localize, localizeProduct } from '@/lib/category';
import { APP_NAME, LISTING_TYPE_KEYS, LISTING_TYPE_PARAMS, listingTypeOf, NEW_LISTING_HOURS, type ListingType } from '@/lib/constants';
import { feedCardLabels } from '@/lib/listing-labels';
import { getT } from '@/lib/i18n-server';
import { getShopPlaces, getVisitorPlaceIds } from '@/lib/places';
import ExploreSearch, { type SearchChoice, type SearchListing } from '@/components/shared/explore-search';
import ShowAllPlacesButton from '@/components/shared/show-all-places-button';
import PullUpHome from '@/components/shared/pull-up-home';
import { metaDescription, pageAlternates } from '@/lib/seo';
import { foldText, queryWords, searchScore, type SearchableText } from '@/lib/search-text';
import { timeAgo } from '@/lib/utils';
import styles from './explore.module.css';

/** The field gets this much of each description: enough for suggestions, the results read all of it. */
const SUGGESTION_TEXT_LENGTH = 400;
/** The kinds the field offers next to the categories; items for sale are everything else. */
const SEARCH_KINDS: ListingType[] = ['WANTED', 'SERVICE', 'EVENT'];

interface ExplorePageProps {
  /** `q` the typed search, `c` a category (its slug), `tipo` a kind of listing (e.g. eventos). None: everything. */
  searchParams: Promise<{ q?: string; c?: string; tipo?: string }>;
}

type Listing = Awaited<ReturnType<typeof getInStockRings>>[number];

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return {
    title: t('EXPLORE_SEO_TITLE'),
    description: metaDescription(t('EXPLORE_SEO_DESCRIPTION', { shop: APP_NAME })),
    alternates: await pageAlternates('/explore'),
  };
}

// Every language's text, so a visitor finds a listing by the words of any of them.
const allTexts = (value: unknown) => Object.values((value ?? {}) as Record<string, string>).filter(Boolean);

/** The whole marketplace in one scroll, with a search on top; a search, category or kind shows its matches first. */
export default async function ExplorePage({ searchParams }: ExplorePageProps) {
  const [{ q = '', c: categorySlug, tipo }, { t, locale }, categories, allListings, placeIds] = await Promise.all([
    searchParams,
    getT(),
    getStoreCategories(),
    getInStockRings(),
    getVisitorPlaceIds(),
  ]);
  const listings = inPlaces(allListings, placeIds);
  const now = new Date();
  const inCategory = (categoryId: string) => listings.filter((listing) => listing.categoryIds.includes(categoryId));
  const filledCategories = categories.filter((category) => inCategory(category.id).length > 0);
  const categoryById = new Map(categories.map((category) => [category.id, category]));

  // A listing is found by its names, and by its description, its categories' names and its kind.
  const searchTextOf = (listing: Listing): SearchableText => {
    const translations = Object.values((listing.translations ?? {}) as Record<string, { name?: string; shortName?: string; description?: string }>);
    const ownCategories = listing.categoryIds.map((id) => categoryById.get(id)).filter((category) => category !== undefined);
    return {
      names: [listing.name, listing.shortName, ...translations.flatMap((text) => [text.name, text.shortName])].filter(Boolean).map((name) => foldText(name!)).join(' | '),
      rest: foldText(
        [
          listing.description,
          ...translations.map((text) => text.description),
          // Only the category's names: its keywords would make every listing in it a match (they find the category itself).
          ...ownCategories.flatMap((category) => allTexts(category.name)),
          t(LISTING_TYPE_KEYS[listing.type]),
        ]
          .filter(Boolean)
          .join(' ')
      ),
    };
  };

  const words = queryWords(q);
  const focus = filledCategories.find((category) => category.slug === categorySlug);
  // Old links to the former Eventos category (?c=eventos) open the events.
  const kind = listingTypeOf(tipo) ?? (!focus ? listingTypeOf(categorySlug) : undefined);
  const results =
    words.length > 0
      ? listings
          .map((listing) => ({ listing, score: searchScore(searchTextOf(listing), words) }))
          .filter(({ score }) => score > 0)
          .sort((a, b) => b.score - a.score)
          .map(({ listing }) => listing)
      : focus
        ? inCategory(focus.id)
        : kind
          ? listings.filter((listing) => listing.type === kind)
          : undefined;
  const filterLabel = words.length > 0 ? q.trim() : focus ? localize(focus.name, locale) : kind ? t(LISTING_TYPE_KEYS[kind]) : '';
  // After the matches the feed goes on with everything else, so there is always something to scroll.
  const others = results ? listings.filter((listing) => !results.includes(listing)) : listings;

  const livePlaces = (await getShopPlaces(locale)).filter((place) => place.isLive);
  // The town on each card only tells something once there's more than one.
  const placeName = new Map(livePlaces.length > 1 ? livePlaces.map((place) => [place.id, place.name]) : []);
  const slugOf = new Map(categories.map((category) => [category.id, category.slug]));
  const whatsappUrl = BRAND.contact.showPhone ? BRAND.contact.sellWhatsappUrl(t('SELL_WHATSAPP_MESSAGE', { shop: APP_NAME })) : undefined;
  // The listing's own category, so its page leads back to a feed that opens with similar things.
  const hrefOf = (listing: Listing) => {
    const ownSlug = listing.categoryIds.map((id) => slugOf.get(id)).find(Boolean);
    return ownSlug ? `/product/${listing.slug}?c=${ownSlug}` : `/product/${listing.slug}`;
  };

  const searchListings: SearchListing[] = listings.map((listing) => {
    const text = searchTextOf(listing);
    const category = categoryById.get(listing.categoryIds[0]);
    return {
      href: hrefOf(listing),
      name: localizeProduct(listing, locale).name,
      image: listing.image,
      category: category && localize(category.name, locale),
      text: { names: text.names, rest: text.rest.slice(0, SUGGESTION_TEXT_LENGTH) },
    };
  });
  const searchChoices: SearchChoice[] = [
    ...SEARCH_KINDS.map((type) => ({ type, count: listings.filter((listing) => listing.type === type).length }))
      .filter(({ count }) => count > 0)
      .map(({ type, count }) => ({
        href: `/explore?tipo=${LISTING_TYPE_PARAMS[type]}`,
        label: t(LISTING_TYPE_KEYS[type]),
        count,
        text: { names: foldText(t(LISTING_TYPE_KEYS[type])), rest: '' },
      })),
    ...filledCategories.map((category) => ({
      href: `/explore?c=${category.slug}`,
      label: localize(category.name, locale),
      image: category.image ?? inCategory(category.id)[0]?.image,
      count: inCategory(category.id).length,
      text: { names: allTexts(category.name).map(foldText).join(' | '), rest: foldText(category.keywords.join(' ')) },
    })),
  ];

  const renderCard = (listing: Listing) => {
    // A listing's product is created when it goes live, so createdAt is its publish time.
    // An event isn't "new" nor old: its card leads with its day and time instead (the "new" counts still include it).
    const isEvent = listing.type === 'EVENT';
    const isNew = !isEvent && now.getTime() - listing.createdAt.getTime() < NEW_LISTING_HOURS * 60 * 60 * 1000;
    return (
      <FeedCard
        href={hrefOf(listing)}
        name={localizeProduct(listing, locale).name}
        images={listing.images}
        price={listing.price}
        priceMax={listing.priceMax}
        {...feedCardLabels(listing, t, locale, now)}
        aiLabel={listing.isIllustrative ? t('PRODUCT_ILLUSTRATIVE') : undefined}
        isReserved={listing.isReserved}
        reservedLabel={t('RESERVE_BADGE')}
        newLabel={isNew ? t('EXPLORE_NEW_BADGE') : undefined}
        listedAgo={[!isEvent && timeAgo(listing.createdAt, locale, now), listing.placeId && placeName.get(listing.placeId)].filter(Boolean).join(' · ')}
      />
    );
  };

  const renderTiles = (tiles: Listing[]) => (
    <ul className={styles.grid}>
      {tiles.map((listing) => (
        <li key={listing.id} className={styles.tile}>
          {renderCard(listing)}
        </li>
      ))}
    </ul>
  );

  // The way back home is the pull up at the top of the page; its arrow is only for screen readers.
  const pullUpHome = <PullUpHome href='/' label={t('PULL_UP_HOME', { shop: APP_NAME })} />;

  return (
    // data-feed-page: the ring's morph waits for this page (use-open-feed.ts).
    <div className='mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:space-y-8 sm:py-8' data-feed-page=''>
      <h1 className='sr-only'>{filterLabel || t('EXPLORE_TITLE')}</h1>
      <div className='sr-only'>{pullUpHome}</div>

      {listings.length > 0 && <ExploreSearch key={filterLabel} listings={searchListings} choices={searchChoices} value={filterLabel} isFiltered={Boolean(results)} />}

      {listings.length === 0 && allListings.length > 0 ? (
        <div className='space-y-4 py-16 text-center'>
          <p className='text-muted-foreground'>{t('PLACES_EMPTY')}</p>
          <ShowAllPlacesButton slugs={livePlaces.map((place) => place.slug)} label={t('PLACES_SHOW_ALL')} />
        </div>
      ) : listings.length === 0 ? (
        <p className='py-16 text-center text-muted-foreground'>{t('STORE_EMPTY')}</p>
      ) : (
        <>
          {results && (
            <section className='space-y-3'>
              <h2 className='text-balance font-display text-xl sm:text-2xl'>
                {results.length > 0
                  ? t('EXPLORE_SEARCH_RESULTS', { query: filterLabel, count: results.length })
                  : t('EXPLORE_SEARCH_NONE', { query: filterLabel })}
              </h2>
              {results.length > 0 && renderTiles(results)}
            </section>
          )}
          {others.length > 0 && (
            <section className='space-y-3'>
              {results && <h2 className='font-display text-xl sm:text-2xl'>{t('EXPLORE_MORE')}</h2>}
              {renderTiles(others)}
            </section>
          )}

          {/* A clear end instead of a void, with an invitation to sell or offer something. */}
          <div className='flex flex-col items-center gap-3 py-12 text-center sm:py-16'>
            <span aria-hidden='true' className='h-px w-16 bg-gradient-to-r from-transparent via-primary to-transparent' />
            <p className='text-balance font-display text-2xl sm:text-3xl'>{t('EXPLORE_END_TITLE')}</p>
            <p className='max-w-md text-pretty text-muted-foreground'>{t('EXPLORE_END_TEXT', { shop: APP_NAME })}</p>
            {whatsappUrl && (
              <Button asChild size='lg' className='rounded-full'>
                <a href={whatsappUrl} target='_blank' rel='noopener noreferrer'>
                  {t('HOME_HERO_ORDER_BUTTON')}
                </a>
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
