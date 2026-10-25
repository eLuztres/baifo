import type { Metadata } from 'next';
import Link from 'next/link';
import FeedCard from '@/components/shared/product/feed-card';
import { Button } from '@/components/ui/button';
import { getInStockRings } from '@/components/shared/home/in-stock-rings';
import { getStoreCategories, getSubcategories } from '@/lib/actions/category.actions';
import { BRAND } from '@/lib/brand';
import { localize, localizeProduct } from '@/lib/category';
import { APP_NAME } from '@/lib/constants';
import { composeFeed } from '@/lib/feed';
import { getT } from '@/lib/i18n-server';
import { metaDescription, pageAlternates } from '@/lib/seo';
import { cn, timeAgo } from '@/lib/utils';
import styles from './explore.module.css';

/** Every ninth tile is big, alternating sides, like an Instagram explore grid. */
const BLOCK_SIZE = 9;
/** Listings younger than this get the "New" badge. */
const NEW_LISTING_MS = 2 * 24 * 60 * 60 * 1000;

interface ExplorePageProps {
  /** `c`: the category the visitor came from (its slug), whose listings open the feed; `sub`: one of its subcategories. */
  searchParams: Promise<{ c?: string; sub?: string }>;
}

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
  const [{ c: focusSlug, sub: subSlug }, { t, locale }, categories, listings] = await Promise.all([
    searchParams,
    getT(),
    getStoreCategories(),
    getInStockRings(),
  ]);
  const filledCategories = categories.filter((category) => listings.some((listing) => listing.categoryIds.includes(category.id)));
  const focus = filledCategories.find((category) => category.slug === focusSlug);
  // Only kinds that have listings, e.g. the services someone offers right now.
  const subcategories = focus
    ? (await getSubcategories(focus.slug)).filter((item) => listings.some((listing) => listing.categoryIds.includes(item.id)))
    : [];
  const subcategory = subcategories.find((item) => item.slug === subSlug);
  const slugOf = new Map(categories.map((category) => [category.id, category.slug]));
  const feed = composeFeed(listings, subcategory?.id ?? focus?.id, `${todayOnTheIsland()}:${focus?.slug ?? ''}:${subcategory?.slug ?? ''}`);
  const now = new Date();
  const whatsappUrl = BRAND.contact.showPhone ? BRAND.contact.whatsappUrl : undefined;

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
        <nav aria-label={t('CATEGORY_ALL')} className='-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]'>
          <Link href='/explore' aria-current={!focus ? 'page' : undefined} className={chipClass(!focus)}>
            {t('EXPLORE_ALL')}
          </Link>
          {filledCategories.map((category) => (
            <Link
              key={category.id}
              href={`/explore?c=${category.slug}`}
              aria-current={category.id === focus?.id && !subcategory ? 'page' : undefined}
              className={chipClass(category.id === focus?.id)}
            >
              {localize(category.name, locale)}
            </Link>
          ))}
        </nav>
        {focus && subcategories.length > 0 && (
          <nav aria-label={localize(focus.name, locale)} className='-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]'>
            <Link href={`/explore?c=${focus.slug}`} aria-current={!subcategory ? 'page' : undefined} className={chipClass(!subcategory)}>
              {t('CATEGORY_SUB_ALL')}
            </Link>
            {subcategories.map((item) => (
              <Link
                key={item.id}
                href={`/explore?c=${focus.slug}&sub=${item.slug}`}
                aria-current={item.id === subcategory?.id ? 'page' : undefined}
                className={chipClass(item.id === subcategory?.id)}
              >
                {localize(item.name, locale)}
              </Link>
            ))}
          </nav>
        )}
      </div>

      {feed.length === 0 ? (
        <p className='py-16 text-center text-muted-foreground'>{t('STORE_EMPTY')}</p>
      ) : (
        <ul className={styles.grid}>
          {feed.map((listing, index) => {
            const isLarge = index % BLOCK_SIZE === 0;
            const isRight = Math.floor(index / BLOCK_SIZE) % 2 === 1;
            // The listing's own category, so its page leads back to a feed that opens with similar things.
            const categorySlug = listing.categoryIds.map((id) => slugOf.get(id)).find(Boolean);
            const isNew = now.getTime() - listing.createdAt.getTime() < NEW_LISTING_MS;
            return (
              <li key={listing.id} className={cn(styles.tile, isLarge && styles.large, isLarge && isRight && styles.right)}>
                <FeedCard
                  href={categorySlug ? `/product/${listing.slug}?c=${categorySlug}` : `/product/${listing.slug}`}
                  name={localizeProduct(listing, locale).name}
                  images={listing.images}
                  price={listing.price}
                  badge={listing.isService ? t('EXPLORE_SERVICE_BADGE') : undefined}
                  isReserved={listing.isReserved}
                  reservedLabel={t('RESERVE_BADGE')}
                  newLabel={isNew ? t('EXPLORE_NEW_BADGE') : undefined}
                  listedAgo={timeAgo(listing.createdAt, locale, now)}
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
                {t('HOME_HERO_ORDER')}
              </a>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
