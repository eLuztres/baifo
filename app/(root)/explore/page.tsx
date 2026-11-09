import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import productStyles from '@/app/(root)/product/[slug]/product-view.module.css';
import ProductMedia from '@/components/ProductMedia';
import FilterDropdown from '@/components/admin/filter-dropdown';
import ExploreSearch, { type SearchChoice, type SearchListing } from '@/components/shared/explore-search';
import { Button } from '@/components/ui/button';
import { getInStockRings, getSellerNames, inPlaces } from '@/components/shared/home/in-stock-rings';
import ContactSection from '@/components/shared/home/contact-section';
import { SECTION_IDS } from '@/components/shared/home/one-page';
import WorkshopSection from '@/components/shared/home/workshop-section';
import AiPictureMark from '@/components/shared/product/ai-picture-mark';
import MovingPictures from '@/components/shared/product/moving-pictures';
import { toPictureMotion } from '@/lib/picture-motion';
import { isVideoUrl } from '@/lib/video';
import { absoluteUrl, BRAND } from '@/lib/brand';
import { localize, localizeProduct } from '@/lib/localize';
import { APP_NAME, SERVER_URL, LISTING_TYPE_KEYS, PRICE_FILTER_STEPS, SHOWS_PRICES } from '@/lib/constants';
import { feedCardLabels } from '@/lib/listing-labels';
import { getT } from '@/lib/i18n-server';
import { adminTexts } from '@/lib/marketplace/admin-texts';
import { getMercadilloContactMessage } from '@/lib/marketplace/contact-texts';
import { getMercadillos, pickRowSpots } from '@/lib/mercadillos';
import { getTagOptions } from '@/lib/tags';
import { getVisitorPlaceIds } from '@/lib/places';
import { getScoutChoices } from '@/lib/scout-choices';
import StickyFilterRow from '@/components/shared/sticky-filter-row';
import MercadilloRow, { MercadilloIcon, MercadilloRowItem } from '@/components/shared/mercadillo-row';
import ContactSellerButton from '@/components/shared/product/contact-seller-button';
import PrepareSharePreview from '@/components/shared/product/prepare-share-preview';
import ShareButton from '@/components/shared/product/share-button';
import PullUpHome from '@/components/shared/pull-up-home';
import WhoSentYouLink from '@/components/shared/who-sent-you';
import ExploreScrollKeeper from '@/components/shared/explore-scroll-keeper';
import { metaDescription, pageAlternates } from '@/lib/seo';
import { foldText, mainMatches, queryWords, type SearchableText } from '@/lib/search-text';
import TagBadges from '@/components/shared/product/tag-badges';
import { findTagByParam, tagHref, tagNameIn } from '@/lib/tag-names';
import { chosenTypeFilters, currentExploreLink, inScopeOf, ofTypes, TYPE_FILTERS } from '@/lib/explore-filters';
import { isInPriceRange, parsePriceRange, priceRanges } from '@/lib/price-ranges';
import { cn, formatNumber, formatPriceTag } from '@/lib/utils';
import { freshMix, MIX_COOKIE } from '@/lib/fresh-mix';

interface ExplorePageProps {
  /** `q` the typed search, `tipo` kinds of listing (comma separated), `precio` a price range, `mercadillo` one Mercadillo's listings, `etiqueta` one etiqueta's. `categoria` and `c` are older links. */
  searchParams: Promise<{ q?: string; tipo?: string; precio?: string; categoria?: string; mercadillo?: string; c?: string; etiqueta?: string }>;
}

type Listing = Awaited<ReturnType<typeof getInStockRings>>[number];

// Each card's picture stays a moment before the next; the cards change at their own times, as they come on screen.
const CARD_TURN_MS = 4000;
// Chosen on the server, per visit, so the list never looks the same and the page's first paint already shows it.
const randomStart = () => Math.floor(Math.random() * 1000);

// A suggestion only needs the start of a long description.
const SUGGESTION_TEXT_LENGTH = 400;

// Without prices on show there is nothing to filter by.
const PRICE_RANGES = SHOWS_PRICES ? priceRanges(PRICE_FILTER_STEPS) : [];

export async function generateMetadata({ searchParams }: ExplorePageProps): Promise<Metadata> {
  const [{ q, tipo, mercadillo, etiqueta }, { t, locale }, mercadillos, tags] = await Promise.all([searchParams, getT(), getMercadillos(), getTagOptions()]);
  // A shared Mercadillo shows its own name, words and picture.
  const shared = !q && !tipo && mercadillos.find((option) => option.slug === mercadillo);
  if (shared) {
    const title = t('MERCADILLO_NAMED', { name: localize(shared.name, locale) });
    const description = metaDescription(localize(shared.text, locale)) || undefined;
    return {
      title,
      description,
      alternates: await pageAlternates(`/explore?mercadillo=${shared.slug}`),
      openGraph: {
        siteName: BRAND.name,
        title,
        description,
        locale,
        images: [{ url: absoluteUrl(`/mercadillo/${shared.slug}/preview.jpg`, SERVER_URL), width: 800, height: 800, type: 'image/jpeg' }],
      },
    };
  }
  // A shared etiqueta's link shows its name, in the language it is opened in.
  const sharedTag = !q && !tipo && !mercadillo && findTagByParam(tags, etiqueta);
  if (sharedTag) {
    const title = tagNameIn(sharedTag.names, locale);
    return { title, alternates: await pageAlternates(tagHref(sharedTag.names, locale)), openGraph: { siteName: BRAND.name, title, locale } };
  }
  return {
    title: t('EXPLORE_SEO_TITLE'),
    description: metaDescription(t('EXPLORE_SEO_DESCRIPTION', { shop: APP_NAME })),
    alternates: await pageAlternates('/explore'),
  };
}


/** The whole marketplace as one list: search and filters on one line, then each listing's picture, title and price. */
export default async function ExplorePage({ searchParams }: ExplorePageProps) {
  const [{ q = '', tipo, precio, categoria, mercadillo, c, etiqueta }, { t, locale }, storedListings, placeIds, mercadillos, cookieStore] = await Promise.all([
    searchParams,
    getT(),
    getInStockRings(),
    getVisitorPlaceIds(),
    getMercadillos(),
    cookies(),
  ]);
  // Not always the newest on top: each visitor's own order, new every few hours.
  const allListings = freshMix(storedListings, cookieStore.get(MIX_COOKIE)?.value ?? '');
  const currentLink = currentExploreLink({ c, categoria });
  if (currentLink) redirect(currentLink);

  const texts = adminTexts(locale);
  const now = new Date();
  const listings = inPlaces(allListings, placeIds);
  const sellerNames = await getSellerNames(listings.map((listing) => listing.id));

  // A listing is found by its names and etiquetas (in every language), and by its description and its kind.
  const searchTextOf = (listing: Listing): SearchableText => {
    const translations = Object.values((listing.translations ?? {}) as Record<string, { name?: string; shortName?: string; description?: string }>);
    return {
      names: [listing.name, listing.shortName, ...translations.flatMap((text) => [text.name, text.shortName]), ...listing.tags.flatMap((tag) => Object.values(tag.names))].filter(Boolean).map((name) => foldText(name!)).join(' | '),
      rest: foldText(
        [
          listing.description,
          ...translations.map((text) => text.description),
          t(LISTING_TYPE_KEYS[listing.type]),
        ]
          .filter(Boolean)
          .join(' ')
      ),
    };
  };

  const words = queryWords(q);
  const chosenMercadillo = mercadillos.find((option) => option.slug === mercadillo);
  // A chosen etiqueta shows exactly the listings that carry it.
  const chosenTag = findTagByParam(listings.flatMap((listing) => listing.tags), etiqueta);
  const inScope = inScopeOf(listings, { mercadilloId: chosenMercadillo?.id, tagId: chosenTag?.id });
  const found = words.length > 0 ? mainMatches(inScope, searchTextOf, words) : inScope;
  const chosenFilters = chosenTypeFilters(tipo);
  const types = chosenFilters.flatMap((filter) => filter.types);
  const ofType = ofTypes(found, types);
  const chosenRange = parsePriceRange(PRICE_RANGES, precio);
  const shown = chosenRange ? ofType.filter((listing) => isInPriceRange(listing.price, chosenRange)) : ofType;

  // Only the plain list has rows: a search or filter shows every match in the grid.
  const isPlainList = !chosenMercadillo && !chosenTag && words.length === 0 && types.length === 0 && !chosenRange;
  const rows = isPlainList
    ? mercadillos.map((option) => ({ mercadillo: option, listings: shown.filter((listing) => listing.mercadilloIds.includes(option.id)) })).filter((row) => row.listings.length > 0)
    : [];
  const gridListings = isPlainList ? shown.filter((listing) => listing.mercadilloIds.length === 0) : shown;
  const rowSpots = pickRowSpots(gridListings.length, rows.length);
  const rowsAt = (spot: number) => rows.filter((_, index) => rowSpots[index] === spot);

  // A listing's way back returns to these same filters.
  const activeFilters = new URLSearchParams(Object.entries({ q, tipo, precio, mercadillo, etiqueta }).filter((entry): entry is [string, string] => Boolean(entry[1]))).toString();
  const hrefOf = (listing: Listing) => `/product/${listing.slug}${activeFilters ? `?from=${encodeURIComponent(activeFilters)}` : ''}`;
  const searchListings: SearchListing[] = listings.map((listing) => {
    const text = searchTextOf(listing);
    return {
      href: hrefOf(listing),
      name: localizeProduct(listing, locale).name,
      image: listing.image,
      text: { names: text.names, rest: text.rest.slice(0, SUGGESTION_TEXT_LENGTH) },
    };
  });
  const searchChoices: SearchChoice[] = TYPE_FILTERS.map((filter) => ({ filter, count: listings.filter((listing) => filter.types.includes(listing.type)).length }))
    .filter(({ count }) => count > 0)
    .map(({ filter, count }) => ({
      href: `/explore?tipo=${filter.params[0]}`,
      label: t(filter.labelKey),
      count,
      text: { names: foldText(t(filter.labelKey)), rest: '' },
    }));
  // Every etiqueta on a listing, once, with how many listings carry it; found by its name in any language.
  const tagCounts = new Map<string, { tag: Listing['tags'][number]; count: number }>();
  for (const tag of listings.flatMap((listing) => listing.tags)) tagCounts.set(tag.id, { tag, count: (tagCounts.get(tag.id)?.count ?? 0) + 1 });
  const searchTags: SearchChoice[] = [...tagCounts.values()].map(({ tag, count }) => ({
    href: tagHref(tag.names, locale),
    label: tagNameIn(tag.names, locale),
    count,
    text: { names: Object.values(tag.names).filter(Boolean).map((name) => foldText(name!)).join(' | '), rest: '' },
  }));
  const shownTag = chosenTag ? tagNameIn(chosenTag.names, locale) : '';
  // Each range with how many of the listings left by the other filters it holds; empty ones hide, the chosen one stays.
  const priceOptions = PRICE_RANGES.map((range) => ({
    value: range.value,
    label:
      range.min === 0
        ? t('PRICE_RANGE_UP_TO', { max: formatPriceTag(range.max!) })
        : range.max === undefined
          ? t('PRICE_RANGE_OVER', { min: formatPriceTag(range.min) })
          : t('PRICE_RANGE_BETWEEN', { min: formatNumber(range.min), max: formatPriceTag(range.max) }),
    // The button has room for "100–250 €" and "+500 €" on a phone.
    shortLabel:
      range.min === 0 ? undefined : range.max === undefined ? `+${formatPriceTag(range.min)}` : `${formatNumber(range.min)}–${formatPriceTag(range.max)}`,
    count: ofType.filter((listing) => isInPriceRange(listing.price, range)).length,
  })).filter((option) => option.count > 0 || option.value === chosenRange?.value);

  const whatsappUrl = BRAND.contact.showPhone ? BRAND.contact.sellWhatsappUrl(t('SELL_WHATSAPP_MESSAGE', { shop: APP_NAME })) : undefined;
  const scouts = whatsappUrl ? await getScoutChoices(t) : [];

  const renderCard = (listing: Listing, sizes = '(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw') => {
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
          {/* A video plays instead; photos move from one to the next as the listing chose. */}
          {isVideoUrl(listing.images[0]) ? (
            <ProductMedia src={listing.images[0]} alt={name} fill sizes={sizes} playsWhenVisible />
          ) : (
            <MovingPictures images={listing.images.filter((image) => !isVideoUrl(image))} alt={name} motion={toPictureMotion(listing.pictureMotion)} sizes={sizes} turnMs={CARD_TURN_MS} hasCloseUps start={randomStart()} />
          )}
          {pictureLabel && (
            <span className='absolute bottom-2 left-2 max-w-[calc(100%-1rem)] truncate rounded-xl bg-background/90 px-2.5 py-1 text-xs font-medium shadow sm:bottom-3 sm:left-3'>
              {pictureLabel}
            </span>
          )}
        </div>
        <div className='flex flex-1 flex-col gap-1 p-3 sm:p-4'>
          <p className='line-clamp-4 text-sm font-medium leading-5 sm:line-clamp-2 sm:text-base'>{name}</p>
          {/* One line at most, whole badges only: the card stays as tall as its neighbours. */}
          <TagBadges tags={listing.tags} locale={locale} className='max-h-[1.375rem] overflow-hidden' />
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

  // A full-width line of the grid: the Mercadillo's heading, then its listings to swipe through.
  const renderRow = (row: (typeof rows)[number]) => {
    const name = localize(row.mercadillo.name, locale);
    return (
      <li key={row.mercadillo.id} className='col-span-full'>
        <MercadilloRow
          label={t('MERCADILLO_LABEL')}
          name={name}
          heading={t('MERCADILLO_NAMED', { name })}
          text={localize(row.mercadillo.text, locale)}
          icon={row.mercadillo.icon}
          href={`/explore?mercadillo=${row.mercadillo.slug}`}
          seeAllLabel={t('MERCADILLO_SEE_ALL')}
          pageLabel={t('MERCADILLO_PAGE')}
          backLabel={t('MERCADILLO_SCROLL_BACK')}
          nextLabel={t('MERCADILLO_SCROLL_NEXT')}
        >
          {row.listings.map((listing) => (
            <MercadilloRowItem key={listing.id}>{renderCard(listing, '(min-width: 1280px) 20vw, (min-width: 768px) 27vw, 62vw')}</MercadilloRowItem>
          ))}
        </MercadilloRow>
      </li>
    );
  };

  // A Mercadillo's page is long on a phone: the way back is at its top and at its end.
  const backToList = (
    <Link href='/explore' aria-label={t('MERCADILLO_SEE_ALL_LISTINGS')} className={cn(productStyles.backButton, productStyles.backButtonInPage)}>
      <ArrowLeft strokeWidth={2.4} aria-hidden />
    </Link>
  );

  // The way back home is the pull up at the top of the page; its arrow is only for screen readers.
  const pullUpHome = <PullUpHome href='/' label={t('PULL_UP_HOME', { shop: APP_NAME })} />;

  return (
    // data-feed-page: the ring's morph waits for this page (use-open-feed.ts). The id lights the listings tab above the parts below.
    <div id={SECTION_IDS.showroom} className='mx-auto w-full max-w-7xl space-y-5 px-1 pb-10 max-sm:-mt-4 sm:space-y-8' data-feed-page=''>
      <h1 className='sr-only'>
        {q.trim() ||
          (chosenMercadillo && localize(chosenMercadillo.name, locale)) ||
          t('EXPLORE_SEO_TITLE')}
      </h1>
      <div className='sr-only'>{pullUpHome}</div>
      <ExploreScrollKeeper />

      {listings.length === 0 ? (
        <p className='py-16 text-center text-muted-foreground'>{t('STORE_EMPTY')}</p>
      ) : (
        <>
          {/* Its own box, so the search row stops following at the list's end and never covers what comes after. */}
          <div className='space-y-5 sm:space-y-8'>
            {/* Phones: while typing the field takes the whole line, so its suggestions have room. */}
            <StickyFilterRow className='group flex gap-2'>
              <ExploreSearch
                key={q || shownTag}
                listings={searchListings}
                choices={searchChoices}
                tags={searchTags}
                value={q || shownTag}
                isFiltered={words.length > 0 || Boolean(chosenTag)}
              />
              <div className='flex shrink-0 gap-2 max-sm:group-has-[input:focus]:hidden'>
                <FilterDropdown
                  label={texts.typeFilter}
                  allLabel={texts.all}
                  param='tipo'
                  options={TYPE_FILTERS.map((filter) => ({
                    value: filter.params[0],
                    label: t(filter.labelKey),
                    count: found.filter((listing) => filter.types.includes(listing.type)).length,
                  })).filter((option) => option.count > 0 || chosenFilters.some((filter) => filter.params[0] === option.value))}
                  selected={chosenFilters.map((filter) => filter.params[0])}
                  isCompact
                  isSingleChoice
                  className='w-24 sm:w-40 lg:w-44'
                />
                {priceOptions.length > 0 && (
                  <FilterDropdown
                    label={t('SEARCH_PRICE')}
                    allLabel={texts.all}
                    param='precio'
                    options={priceOptions}
                    selected={chosenRange ? [chosenRange.value] : []}
                    isCompact
                    isSingleChoice
                    className='w-28 sm:w-44 lg:w-48'
                  />
                )}
              </div>
            </StickyFilterRow>

            {chosenMercadillo && (
              <section className='relative overflow-hidden rounded-3xl border border-border bg-card px-5 pb-7 pt-10 text-center sm:px-8 sm:py-8'>
                <PrepareSharePreview src={`/mercadillo/${chosenMercadillo.slug}/preview.jpg`} />
                {chosenMercadillo.image ? (
                  <div aria-hidden className='absolute inset-0'>
                    <ProductMedia src={chosenMercadillo.image} alt='' fill sizes='(min-width: 1280px) 80rem, 100vw' isStill />
                    <div className='absolute inset-0 bg-gradient-to-b from-card/70 via-card/85 to-card' />
                  </div>
                ) : (
                  <div aria-hidden className='absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-primary/20 to-transparent' />
                )}
                <div className='absolute left-4 top-4 z-10'>{backToList}</div>
                <div className='relative flex flex-col items-center gap-4 sm:gap-5'>
                  <MercadilloIcon
                    src={chosenMercadillo.icon}
                    sizes='(min-width: 640px) 11rem, 10rem'
                    className='size-40 shadow-2xl shadow-primary/25 ring-4 ring-background sm:size-44'
                  />
                  <div className='space-y-1'>
                    <p className='text-xs font-medium uppercase tracking-[0.25em] text-primary sm:text-sm'>{t('MERCADILLO_LABEL')}</p>
                    <p className='text-balance font-display text-5xl leading-none sm:text-6xl'>{localize(chosenMercadillo.name, locale)}</p>
                  </div>
                  <p className='max-w-xl text-pretty text-base leading-relaxed text-foreground/85 sm:text-lg'>{localize(chosenMercadillo.text, locale)}</p>
                  <p className='rounded-full bg-muted px-3 py-1 text-sm font-medium text-muted-foreground'>
                    {inScope.length === 1 ? t('MERCADILLO_COUNT_ONE') : t('MERCADILLO_COUNT', { count: inScope.length })}
                  </p>
                  <div className='flex w-full max-w-md gap-3'>
                    {/* In its own box, so its padding doesn't make it wider than the contact button. */}
                    <div className='min-w-0 flex-1'>
                      <ShareButton
                        title={t('MERCADILLO_NAMED', { name: localize(chosenMercadillo.name, locale) })}
                        path={`/explore?mercadillo=${chosenMercadillo.slug}`}
                        isLabeled
                        className='w-full'
                      />
                    </div>
                    {chosenMercadillo.contactPhone && (
                      <ContactSellerButton mercadilloId={chosenMercadillo.id} message={getMercadilloContactMessage(chosenMercadillo)} className='min-w-0 flex-1' />
                    )}
                  </div>
                </div>
              </section>
            )}

            {shown.length === 0 ? (
              <p className='rounded-3xl border border-dashed border-border p-12 text-center text-muted-foreground'>
                {words.length > 0 ? t('EXPLORE_SEARCH_NONE', { query: q.trim() }) : texts.empty}
              </p>
            ) : (
              <ul className='grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4'>
                {gridListings.map((listing, index) => [...rowsAt(index).map(renderRow), <li key={listing.id}>{renderCard(listing)}</li>])}
                {rowsAt(gridListings.length).map(renderRow)}
              </ul>
            )}
            {chosenMercadillo && <div className='flex justify-center'>{backToList}</div>}
          </div>

          {/* A clear end instead of a void, with an invitation to sell or offer something. */}
          <div className='flex flex-col items-center gap-3 py-12 text-center sm:py-16'>
            <span aria-hidden='true' className='h-px w-16 bg-gradient-to-r from-transparent via-primary to-transparent' />
            <p className='text-balance font-display text-2xl sm:text-3xl'>{t('EXPLORE_END_TITLE')}</p>
            <p className='max-w-md text-pretty text-muted-foreground'>{t('EXPLORE_END_TEXT', { shop: APP_NAME })}</p>
            {/* First who told them about the shop, then its WhatsApp from that señalador. */}
            {whatsappUrl && (
              <Button asChild size='lg' className='rounded-full'>
                <WhoSentYouLink href={whatsappUrl} scouts={scouts} shopName={APP_NAME}>
                  {t('HOME_HERO_ORDER_BUTTON')}
                </WhoSentYouLink>
              </Button>
            )}
          </div>
        </>
      )}

      {/* The start page doesn't scroll, so these parts follow the listings. */}
      <WorkshopSection />
      <ContactSection />
    </div>
  );
}
