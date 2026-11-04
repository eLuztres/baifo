import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import ProductMedia from '@/components/ProductMedia';
import FilterDropdown from '@/components/admin/filter-dropdown';
import ExploreSearch, { type SearchChoice, type SearchListing } from '@/components/shared/explore-search';
import { Button, buttonVariants } from '@/components/ui/button';
import CorralHostsButton from '@/components/shared/home/corral-hosts-button';
import { getCorralHosts } from '@/components/shared/home/corral-hosts';
import { getInStockRings, getSellerNames, inPlaces } from '@/components/shared/home/in-stock-rings';
import WorkshopSection from '@/components/shared/home/workshop-section';
import AiPictureMark from '@/components/shared/product/ai-picture-mark';
import { getStoreCategories } from '@/lib/actions/category.actions';
import { BRAND } from '@/lib/brand';
import { localize, localizeProduct } from '@/lib/category';
import { APP_NAME, LISTING_TYPE_KEYS, LISTING_TYPE_PARAMS, LISTING_TYPES, listingTypeOf, type ListingType } from '@/lib/constants';
import { feedCardLabels } from '@/lib/listing-labels';
import { getT } from '@/lib/i18n-server';
import { adminTexts } from '@/lib/marketplace/admin-texts';
import { getShopPlaces, getVisitorPlaceIds } from '@/lib/places';
import SettleIntoView from '@/components/shared/settle-into-view';
import ShowAllPlacesButton from '@/components/shared/show-all-places-button';
import StickyFilterRow from '@/components/shared/sticky-filter-row';
import PullUpHome from '@/components/shared/pull-up-home';
import { metaDescription, pageAlternates } from '@/lib/seo';
import { foldText, queryWords, searchScore, type SearchableText } from '@/lib/search-text';
import { cn, formatPriceTag } from '@/lib/utils';

interface ExplorePageProps {
  /** `q` the typed search, `tipo` kinds of listing and `categoria` categories (comma separated). `c` is the older link to one category. */
  searchParams: Promise<{ q?: string; tipo?: string; categoria?: string; c?: string }>;
}

type Listing = Awaited<ReturnType<typeof getInStockRings>>[number];

// A suggestion only needs the start of a long description.
const SUGGESTION_TEXT_LENGTH = 400;

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
const listParam = (param?: string) => param?.split(',').filter(Boolean) ?? [];

/** The whole marketplace as one list: search and filters on one line, then each listing's picture, title and price. */
export default async function ExplorePage({ searchParams }: ExplorePageProps) {
  const [{ q = '', tipo, categoria, c }, { t, locale }, categories, allListings, placeIds] = await Promise.all([
    searchParams,
    getT(),
    getStoreCategories(),
    getInStockRings(),
    getVisitorPlaceIds(),
  ]);
  // Older links keep working (the listing's way back, and ?c=eventos from the former Eventos category).
  if (c) redirect(listingTypeOf(c) && !categories.some((category) => category.slug === c) ? `/explore?tipo=${c}` : `/explore?categoria=${c}`);

  const texts = adminTexts(locale);
  const now = new Date();
  const listings = inPlaces(allListings, placeIds);
  const sellerNames = await getSellerNames(listings.map((listing) => listing.id));
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
  const found =
    words.length > 0
      ? listings
          .map((listing) => ({ listing, score: searchScore(searchTextOf(listing), words) }))
          .filter(({ score }) => score > 0)
          .sort((a, b) => b.score - a.score)
          .map(({ listing }) => listing)
      : listings;
  const types = listParam(tipo).map(listingTypeOf).filter((value): value is ListingType => !!value);
  // A link can name a category that's gone; it counts as not chosen.
  const slugs = listParam(categoria).filter((slug) => categories.some((category) => category.slug === slug));
  const ofType = types.length ? found.filter((listing) => types.includes(listing.type)) : found;
  const categoryIds = categories.filter((category) => slugs.includes(category.slug)).map((category) => category.id);
  const shown = categoryIds.length ? ofType.filter((listing) => listing.categoryIds.some((id) => categoryIds.includes(id))) : ofType;

  const filled = categories
    .map((category) => ({ category, count: ofType.filter((listing) => listing.categoryIds.includes(category.id)).length }))
    // A chosen category stays, even when the type or search leaves it empty, so its name can still show and be undone.
    .filter(({ category, count }) => count > 0 || slugs.includes(category.slug))
    .sort((a, b) => b.count - a.count);

  const hrefOf = (listing: Listing) => `/product/${listing.slug}`;
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
    ...LISTING_TYPES.map((type) => ({ type, count: listings.filter((listing) => listing.type === type).length }))
      .filter(({ count }) => count > 0)
      .map(({ type, count }) => ({
        href: `/explore?tipo=${LISTING_TYPE_PARAMS[type]}`,
        label: t(LISTING_TYPE_KEYS[type]),
        count,
        text: { names: foldText(t(LISTING_TYPE_KEYS[type])), rest: '' },
      })),
    ...categories
      .map((category) => ({ category, inIt: listings.filter((listing) => listing.categoryIds.includes(category.id)) }))
      .filter(({ inIt }) => inIt.length > 0)
      .map(({ category, inIt }) => ({
        href: `/explore?categoria=${category.slug}`,
        label: localize(category.name, locale),
        image: category.image ?? inIt[0]?.image,
        count: inIt.length,
        text: { names: allTexts(category.name).map(foldText).join(' | '), rest: foldText(category.keywords.join(' ')) },
      })),
  ];

  const livePlaces = (await getShopPlaces(locale)).filter((place) => place.isLive);
  const whatsappUrl = BRAND.contact.showPhone ? BRAND.contact.sellWhatsappUrl(t('SELL_WHATSAPP_MESSAGE', { shop: APP_NAME })) : undefined;
  const hosts = await getCorralHosts((name) => t('HOME_HERO_HOST_MESSAGE', { name, shop: APP_NAME }));

  const renderCard = (listing: Listing) => {
    const name = localizeProduct(listing, locale).name;
    const labels = feedCardLabels(listing, t, locale, now);
    const hasNoAmount = (labels.priceLabel || labels.badge) && Number(listing.price) === 0;
    const priceTag = listing.price && !hasNoAmount ? formatPriceTag(Number(listing.price)) : labels.priceText;
    const priceLabel = priceTag && (listing.type === 'WANTED' && labels.priceLabel ? t('PRICE_UP_TO') : labels.priceLabel);
    const sellerName = sellerNames.get(listing.id);
    // Without these the card would mislead: when the event is, that it's taken, that the price is a budget.
    const pictureLabel = listing.isReserved ? t('RESERVE_BADGE') : labels.dateBadge ?? (listing.type === 'WANTED' ? labels.badge : undefined);
    return (
      <Link
        href={hrefOf(listing)}
        className='group flex h-full flex-col overflow-hidden rounded-3xl border border-border bg-card transition max-sm:rounded-2xl hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/10'
      >
        <div className='relative aspect-[3/4] bg-muted'>
          <ProductMedia src={listing.images[0]} alt={name} fill sizes='(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw' playsWhenVisible />
          {pictureLabel && (
            <span className='absolute bottom-2 left-2 max-w-[calc(100%-1rem)] truncate rounded-xl bg-background/90 px-2.5 py-1 text-xs font-medium shadow sm:bottom-3 sm:left-3'>
              {pictureLabel}
            </span>
          )}
        </div>
        <div className='flex flex-1 flex-col gap-1 p-3 sm:p-4'>
          <p className='line-clamp-4 text-sm font-medium leading-5 sm:line-clamp-2 sm:text-base'>{name}</p>
          {/* On one line when both fit; a long name moves below the price. */}
          <div className='mt-auto flex flex-wrap items-center justify-between gap-x-2'>
            <div className='flex min-w-0 items-center gap-1.5'>
              <p className='flex min-w-0 items-baseline gap-1 text-primary tabular-nums'>
                {priceLabel && <span className='shrink-0 text-xs font-medium sm:text-sm'>{priceLabel}</span>}
                <span className='truncate text-lg font-bold sm:text-2xl'>{priceTag}</span>
              </p>
              {listing.isIllustrative && <AiPictureMark label={t('PRODUCT_ILLUSTRATIVE')} />}
            </div>
            {sellerName && <p className='min-w-0 max-w-full truncate text-xs text-muted-foreground'>{sellerName}</p>}
          </div>
        </div>
      </Link>
    );
  };

  // The way back home is the pull up at the top of the page; its arrow is only for screen readers.
  const pullUpHome = <PullUpHome href='/' label={t('PULL_UP_HOME', { shop: APP_NAME })} />;

  return (
    // data-feed-page: the ring's morph waits for this page (use-open-feed.ts).
    <div className='mx-auto w-full max-w-7xl space-y-5 px-1 pb-10 max-sm:-mt-4 sm:space-y-8' data-feed-page=''>
      <h1 className='sr-only'>{q.trim() || t('EXPLORE_TITLE')}</h1>
      <div className='sr-only'>{pullUpHome}</div>

      {listings.length === 0 && allListings.length > 0 ? (
        <div className='space-y-4 py-16 text-center'>
          <p className='text-muted-foreground'>{t('PLACES_EMPTY')}</p>
          <ShowAllPlacesButton slugs={livePlaces.map((place) => place.slug)} label={t('PLACES_SHOW_ALL')} />
        </div>
      ) : listings.length === 0 ? (
        <p className='py-16 text-center text-muted-foreground'>{t('STORE_EMPTY')}</p>
      ) : (
        <>
          {/* Its own box, so the search row stops following at the list's end and never covers what comes after. */}
          <div className='space-y-5 sm:space-y-8'>
            {/* Phones: while typing the field takes the whole line, so its suggestions have room. */}
            <StickyFilterRow className='group flex gap-2'>
              <ExploreSearch key={q} listings={searchListings} choices={searchChoices} value={q} isFiltered={words.length > 0} />
              <div className='flex min-w-0 gap-2 max-sm:group-has-[input:focus]:hidden'>
                <FilterDropdown
                  label={texts.typeFilter}
                  allLabel={texts.all}
                  param='tipo'
                  options={LISTING_TYPES.map((value) => ({
                    value: LISTING_TYPE_PARAMS[value],
                    label: t(LISTING_TYPE_KEYS[value]),
                    count: found.filter((listing) => listing.type === value).length,
                  })).filter((option) => option.count > 0 || types.some((value) => LISTING_TYPE_PARAMS[value] === option.value))}
                  selected={types.map((value) => LISTING_TYPE_PARAMS[value])}
                  isCompact
                />
                <FilterDropdown
                  label={t('SEARCH_CATEGORY')}
                  allLabel={t('SEARCH_ANY')}
                  param='categoria'
                  options={filled.map(({ category, count }) => ({ value: category.slug, label: localize(category.name, locale), count }))}
                  selected={slugs}
                  isCompact
                />
              </div>
            </StickyFilterRow>

            {shown.length === 0 ? (
              <p className='rounded-3xl border border-dashed border-border p-12 text-center text-muted-foreground'>
                {words.length > 0 ? t('EXPLORE_SEARCH_NONE', { query: q.trim() }) : texts.empty}
              </p>
            ) : (
              <ul className='grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4'>
                {shown.map((listing) => (
                  <li key={listing.id}>{renderCard(listing)}</li>
                ))}
              </ul>
            )}
          </div>

          {/* A clear end instead of a void, with an invitation to sell or offer something. */}
          <div className='flex flex-col items-center gap-3 py-12 text-center sm:py-16'>
            <span aria-hidden='true' className='h-px w-16 bg-gradient-to-r from-transparent via-primary to-transparent' />
            <p className='text-balance font-display text-2xl sm:text-3xl'>{t('EXPLORE_END_TITLE')}</p>
            <p className='max-w-md text-pretty text-muted-foreground'>{t('EXPLORE_END_TEXT', { shop: APP_NAME })}</p>
            {/* Publishing starts with a person: the corral hosts; the shop's number only without any. */}
            {hosts.length > 0 ? (
              <CorralHostsButton hosts={hosts} text={t('CONTACT_HOSTS_TEXT')} className={cn(buttonVariants({ size: 'lg' }), 'rounded-full')}>
                {t('HOME_HERO_ORDER_BUTTON')}
              </CorralHostsButton>
            ) : whatsappUrl && (
              <Button asChild size='lg' className='rounded-full'>
                <a href={whatsappUrl} target='_blank' rel='noopener noreferrer'>
                  {t('HOME_HERO_ORDER_BUTTON')}
                </a>
              </Button>
            )}
          </div>

          <SettleIntoView>
            <WorkshopSection />
          </SettleIntoView>
        </>
      )}
    </div>
  );
}
