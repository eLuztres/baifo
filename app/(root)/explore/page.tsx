import type { Metadata } from 'next';
import { Fragment } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import FeedCard from '@/components/shared/product/feed-card';
import { Button } from '@/components/ui/button';
import { getInStockRings, inPlaces } from '@/components/shared/home/in-stock-rings';
import { getStoreCategories, getSubcategories } from '@/lib/actions/category.actions';
import { BRAND } from '@/lib/brand';
import { localize, localizeProduct } from '@/lib/category';
import { APP_NAME, ENDING_SOON_DAYS, LISTING_TYPE_KEYS, LISTING_TYPE_PARAMS, listingTypeOf, NEW_LISTING_HOURS } from '@/lib/constants';
import { isShopToday } from '@/lib/event-date';
import { feedCardLabels } from '@/lib/listing-labels';
import { getT } from '@/lib/i18n-server';
import { getShopPlaces, getVisitorPlaceIds } from '@/lib/places';
import ExploreRing, { type ExploreRingItem } from '@/components/shared/explore-ring';
import ExploreRow from '@/components/shared/explore-row';
import ShowAllPlacesButton from '@/components/shared/show-all-places-button';
import PullUpHome from '@/components/shared/pull-up-home';
import { metaDescription, pageAlternates } from '@/lib/seo';
import { followingCategories, MIN_FULL_LISTINGS, moreListingsFor, splitThinRows } from '@/lib/explore-rows';
import { cn, timeAgo } from '@/lib/utils';
import styles from './explore.module.css';

/** Every ninth tile is big, alternating sides, like an Instagram explore grid. */
const BLOCK_SIZE = 9;
/** A row shows this many; "see all" has the rest. */
const ROW_SIZE = 12;
const DAY_MS = 24 * 60 * 60 * 1000;

interface ExplorePageProps {
  /** One choice of the ring: `c` a category (its slug) and `sub` one of its subcategories, `hoy` what happens today,
      `pronto` what goes offline soon, `tipo=eventos` the events. None: the rows of everything. */
  searchParams: Promise<{ tipo?: string; c?: string; sub?: string; hoy?: string; pronto?: string }>;
}

type Listing = Awaited<ReturnType<typeof getInStockRings>>[number];

/** A choice of the ring that isn't a category: its key, link and listings. */
interface FixedChoice {
  key: 'today' | 'ending' | 'events';
  label: string;
  href: string;
  listings: Listing[];
}

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return {
    title: t('EXPLORE_SEO_TITLE'),
    description: metaDescription(t('EXPLORE_SEO_DESCRIPTION', { shop: APP_NAME })),
    alternates: await pageAlternates('/explore'),
  };
}

const byTime = (time: (listing: Listing) => Date | null | undefined) => (a: Listing, b: Listing) => time(a)!.getTime() - time(b)!.getTime();

/** The whole marketplace: rows to swipe (today, ending soon, events, each category), or one choice of the ring in full. */
export default async function ExplorePage({ searchParams }: ExplorePageProps) {
  const [{ tipo, c: focusSlug, sub: subSlug, hoy, pronto }, { t, locale }, categories, allListings, placeIds] = await Promise.all([
    searchParams,
    getT(),
    getStoreCategories(),
    getInStockRings(),
    getVisitorPlaceIds(),
  ]);
  const listings = inPlaces(allListings, placeIds);
  const now = new Date();
  const endingBefore = now.getTime() + ENDING_SOON_DAYS * DAY_MS;
  const fixedChoices: FixedChoice[] = [
    {
      key: 'today',
      label: t('EXPLORE_TODAY'),
      href: '/explore?hoy',
      listings: listings.filter((listing) => listing.startsAt && isShopToday(listing.startsAt, now)).sort(byTime((listing) => listing.startsAt)),
    },
    {
      key: 'ending',
      label: t('EXPLORE_ENDING_SOON'),
      href: '/explore?pronto',
      listings: listings
        .filter((listing) => listing.endsAt && listing.endsAt > now && listing.endsAt.getTime() <= endingBefore)
        .sort(byTime((listing) => listing.endsAt)),
    },
    {
      key: 'events',
      label: t(LISTING_TYPE_KEYS.EVENT),
      href: `/explore?tipo=${LISTING_TYPE_PARAMS.EVENT}`,
      listings: listings.filter((listing) => listing.type === 'EVENT').sort(byTime((listing) => listing.startsAt ?? listing.createdAt)),
    },
  ];
  const filledCategories = categories.filter((category) => listings.some((listing) => listing.categoryIds.includes(category.id)));
  const focus = filledCategories.find((category) => category.slug === focusSlug);
  // Old links to the former Eventos category (?c=eventos) open the events.
  const isEvents = listingTypeOf(tipo) === 'EVENT' || (!focus && listingTypeOf(focusSlug) === 'EVENT');
  const chosenFixed = fixedChoices.find(({ key }) => (key === 'today' ? hoy !== undefined : key === 'ending' ? pronto !== undefined : isEvents));
  const activeKey = focus?.slug ?? chosenFixed?.key ?? 'all';
  // Only subcategories that have listings.
  const subcategory = focus
    ? (await getSubcategories(focus.slug)).find((item) => item.slug === subSlug && listings.some((listing) => listing.categoryIds.includes(item.id)))
    : undefined;
  const inCategory = (categoryId: string) => listings.filter((listing) => listing.categoryIds.includes(categoryId));
  const chosenListings = focus ? inCategory(subcategory?.id ?? focus.id) : (chosenFixed?.listings ?? listings);
  const title = focus ? localize((subcategory ?? focus).name, locale) : (chosenFixed?.label ?? t('EXPLORE_TITLE'));

  // Everything is a choice in the ring; today, ending soon and events only when they have something (or are chosen).
  const ringItems: ExploreRingItem[] = [
    { key: 'all', label: t('EXPLORE_ALL'), href: '/explore' },
    ...fixedChoices.filter((choice) => choice.listings.length > 0 || choice === chosenFixed).map(({ key, label, href }) => ({ key, label, href })),
    ...filledCategories.map((category) => ({
      key: category.slug,
      label: localize(category.name, locale),
      href: `/explore?c=${category.slug}`,
      image: category.image ?? inCategory(category.id)[0]?.image,
    })),
  ];
  const activeIndex = ringItems.findIndex((item) => item.key === activeKey);
  // A whole category scrolls on into the next ones, so only the other choices end with a way on.
  const nextCategories = focus && !subcategory ? followingCategories(filledCategories, focus.id, (category) => inCategory(category.id), chosenListings) : [];
  const nextItem = activeKey !== 'all' && !nextCategories.length && ringItems.length > 1 ? ringItems[(activeIndex + 1) % ringItems.length] : undefined;
  const rows = [
    ...fixedChoices.map(({ label, href, listings: rowListings }) => ({ key: href, title: label, href, listings: rowListings })),
    ...filledCategories.map((category) => ({
      key: category.id,
      title: localize(category.name, locale),
      href: `/explore?c=${category.slug}`,
      listings: inCategory(category.id),
    })),
  ].filter((row) => row.listings.length > 0);
  // Thin rows would each stand alone with a "see all" that adds nothing; their listings show together instead.
  const { fullRows, mixedListings } = splitThinRows(rows);
  const moreListings = activeKey === 'all' || nextCategories.length ? [] : moreListingsFor(chosenListings, listings, ROW_SIZE);

  const livePlaces = (await getShopPlaces(locale)).filter((place) => place.isLive);
  // The town on each card only tells something once there's more than one.
  const placeName = new Map(livePlaces.length > 1 ? livePlaces.map((place) => [place.id, place.name]) : []);
  const slugOf = new Map(categories.map((category) => [category.id, category.slug]));
  const whatsappUrl = BRAND.contact.showPhone ? BRAND.contact.sellWhatsappUrl(t('SELL_WHATSAPP_MESSAGE', { shop: APP_NAME })) : undefined;

  const renderCard = (listing: Listing, isLarge = false) => {
    // The listing's own category, so its page leads back to a feed that opens with similar things.
    const categorySlug = listing.categoryIds.map((id) => slugOf.get(id)).find(Boolean);
    // A listing's product is created when it goes live, so createdAt is its publish time.
    // An event isn't "new" nor old: its card leads with its day and time instead (the "new" counts still include it).
    const isEvent = listing.type === 'EVENT';
    const isNew = !isEvent && now.getTime() - listing.createdAt.getTime() < NEW_LISTING_HOURS * 60 * 60 * 1000;
    return (
      <FeedCard
        href={categorySlug ? `/product/${listing.slug}?c=${categorySlug}` : `/product/${listing.slug}`}
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
        isLarge={isLarge}
      />
    );
  };

  // Every ninth tile is big, on alternating sides; a few tiles stay even, a big one would leave a hole beside them.
  const renderTiles = (tiles: Listing[]) => (
    <ul className={styles.grid}>
      {tiles.map((listing, index) => {
        const isLarge = index % BLOCK_SIZE === 0 && tiles.length >= MIN_FULL_LISTINGS;
        const isRight = Math.floor(index / BLOCK_SIZE) % 2 === 1;
        return (
          <li key={listing.id} className={cn(styles.tile, isLarge && styles.large, isLarge && isRight && styles.right)}>
            {renderCard(listing, isLarge)}
          </li>
        );
      })}
    </ul>
  );

  const renderSection = (sectionTitle: string, tiles: Listing[]) => (
    <section className='space-y-2'>
      <h2 className='font-display text-xl sm:text-2xl'>{sectionTitle}</h2>
      {renderTiles(tiles)}
    </section>
  );

  // The way back home is the pull up at the top of the page; its arrow is only for screen readers, so the wheel stands alone.
  const pullUpHome = <PullUpHome href='/' label={t('PULL_UP_HOME', { shop: APP_NAME })} />;

  return (
    // data-feed-page: the ring's morph waits for this page (use-open-feed.ts).
    <div className='mx-auto w-full max-w-7xl space-y-8 px-4 py-6 sm:space-y-10 sm:py-8' data-feed-page=''>
      {/* The chosen one is named once, under the wheel's front circle; the title is only for screen readers. */}
      <h1 className='sr-only'>{title}</h1>
      <div className='sr-only'>{pullUpHome}</div>

      {ringItems.length > 1 && (
        <ExploreRing
          items={ringItems}
          activeKey={activeKey}
          label={t('EXPLORE_CATEGORY_BUTTON')}
          previousLabel={t('EXPLORE_PREVIOUS')}
          nextLabel={t('EXPLORE_NEXT')}
        />
      )}

      {listings.length === 0 && allListings.length > 0 ? (
        <div className='space-y-4 py-16 text-center'>
          <p className='text-muted-foreground'>{t('PLACES_EMPTY')}</p>
          <ShowAllPlacesButton slugs={livePlaces.map((place) => place.slug)} label={t('PLACES_SHOW_ALL')} />
        </div>
      ) : listings.length === 0 || (activeKey !== 'all' && chosenListings.length === 0) ? (
        <p className='py-16 text-center text-muted-foreground'>{t('STORE_EMPTY')}</p>
      ) : activeKey === 'all' ? (
        <div className='space-y-8 sm:space-y-10'>
          {fullRows.map((row) => (
            <ExploreRow
              key={row.key}
              title={row.title}
              seeAllHref={row.href}
              seeAllLabel={t('EXPLORE_SEE_ALL')}
              previousLabel={t('EXPLORE_PREVIOUS')}
              nextLabel={t('EXPLORE_NEXT')}
            >
              {row.listings.slice(0, ROW_SIZE).map((listing) => (
                <li key={listing.id} className='aspect-[3/4] w-36 shrink-0 snap-start sm:w-44 lg:w-52'>
                  {renderCard(listing)}
                </li>
              ))}
            </ExploreRow>
          ))}
          {mixedListings.length > 0 && renderSection(t(fullRows.length > 0 ? 'EXPLORE_MORE' : 'EXPLORE_TITLE'), mixedListings)}
        </div>
      ) : (
        renderTiles(chosenListings)
      )}

      {nextCategories.map(({ category, listings: categoryListings }) => (
        <Fragment key={category.id}>{renderSection(localize(category.name, locale), categoryListings)}</Fragment>
      ))}

      {/* A thin choice goes on with other listings, so its page is never a card or two and empty space. */}
      {moreListings.length > 0 && renderSection(t('EXPLORE_MORE'), moreListings)}

      {/* A clear end instead of a void: on to the ring's next choice, and an invitation to sell or offer something. */}
      {chosenListings.length > 0 && (
        <div className='flex flex-col items-center gap-3 py-12 text-center sm:py-16'>
          <span aria-hidden='true' className='h-px w-16 bg-gradient-to-r from-transparent via-primary to-transparent' />
          <p className='text-balance font-display text-2xl sm:text-3xl'>{t('EXPLORE_END_TITLE')}</p>
          <p className='max-w-md text-pretty text-muted-foreground'>{t('EXPLORE_END_TEXT', { shop: APP_NAME })}</p>
          {nextItem && (
            <Button asChild variant='outline' size='lg' className='mt-2 rounded-full'>
              <Link href={nextItem.href}>
                {t('EXPLORE_NEXT_CATEGORY', { category: nextItem.label })}
                <ChevronRight aria-hidden />
              </Link>
            </Button>
          )}
          {whatsappUrl && (
            <Button asChild size='lg' className='rounded-full'>
              <a href={whatsappUrl} target='_blank' rel='noopener noreferrer'>
                {t('HOME_HERO_ORDER_BUTTON')}
              </a>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
