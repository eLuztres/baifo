import type { Metadata } from 'next';
import Link from 'next/link';
import FeedCard from '@/components/shared/product/feed-card';
import { getInStockRings } from '@/components/shared/home/in-stock-rings';
import { getStoreCategories } from '@/lib/actions/category.actions';
import { localize, localizeProduct } from '@/lib/category';
import { APP_NAME } from '@/lib/constants';
import { composeFeed } from '@/lib/feed';
import { getT } from '@/lib/i18n-server';
import { cn, timeAgo } from '@/lib/utils';
import styles from './explore.module.css';

/** Every ninth tile is big, alternating sides, like an Instagram explore grid. */
const BLOCK_SIZE = 9;

interface ExplorePageProps {
  /** `c`: the category the visitor came from (its slug); its listings open the feed. */
  searchParams: Promise<{ c?: string }>;
}

const chipClass = (isActive: boolean) =>
  cn(
    'shrink-0 rounded-full border px-4 py-2 text-sm transition',
    isActive
      ? 'border-primary bg-primary text-primary-foreground'
      : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground',
  );

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t('EXPLORE_TITLE') };
}

// The Canary Islands' date: the mix changes once a day and stays put while the visitor scrolls and goes back.
const todayOnTheIsland = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Atlantic/Canary' });

/** The whole marketplace in one read-only feed: products and services mixed, the visitor's category first. */
export default async function ExplorePage({ searchParams }: ExplorePageProps) {
  const [{ c: focusSlug }, { t, locale }, categories, listings] = await Promise.all([
    searchParams,
    getT(),
    getStoreCategories(),
    getInStockRings(),
  ]);
  const filledCategories = categories.filter((category) => listings.some((listing) => listing.categoryIds.includes(category.id)));
  const focus = filledCategories.find((category) => category.slug === focusSlug);
  const slugOf = new Map(categories.map((category) => [category.id, category.slug]));
  const feed = composeFeed(listings, focus?.id, `${todayOnTheIsland()}:${focus?.slug ?? ''}`);
  const now = new Date();

  return (
    <div className='mx-auto w-full max-w-7xl space-y-5 px-4 py-6 sm:py-10'>
      <header className='space-y-2'>
        <div className='flex flex-wrap items-baseline gap-x-4 gap-y-1'>
          <h1 className='font-display text-4xl leading-tight sm:text-5xl'>{t('EXPLORE_TITLE')}</h1>
          <p className='text-sm text-muted-foreground'>{t('STORE_CATEGORY_RINGS', { count: feed.length })}</p>
        </div>
        <p className='max-w-2xl text-muted-foreground'>{t('EXPLORE_INTRO', { shop: APP_NAME })}</p>
      </header>

      <nav
        aria-label={t('CATEGORY_ALL')}
        className='sticky top-[calc(4rem+1px)] z-10 sm:top-[calc(5rem+1px)] -mx-4 flex gap-2 overflow-x-auto bg-background/85 px-4 py-3 backdrop-blur-md'
      >
        <Link href='/explore' aria-current={!focus ? 'page' : undefined} className={chipClass(!focus)}>
          {t('EXPLORE_ALL')}
        </Link>
        {filledCategories.map((category) => (
          <Link
            key={category.id}
            href={`/explore?c=${category.slug}`}
            aria-current={category.id === focus?.id ? 'page' : undefined}
            className={chipClass(category.id === focus?.id)}
          >
            {localize(category.name, locale)}
          </Link>
        ))}
      </nav>

      {feed.length === 0 ? (
        <p className='py-16 text-center text-muted-foreground'>{t('STORE_EMPTY')}</p>
      ) : (
        <ul className={styles.grid}>
          {feed.map((listing, index) => {
            const isLarge = index % BLOCK_SIZE === 0;
            const isRight = Math.floor(index / BLOCK_SIZE) % 2 === 1;
            // The listing's own category, so its page leads back to a feed that opens with similar things.
            const categorySlug = listing.categoryIds.map((id) => slugOf.get(id)).find(Boolean);
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
                  listedAgo={timeAgo(listing.createdAt, locale, now)}
                  isLarge={isLarge}
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
