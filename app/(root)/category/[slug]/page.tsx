import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import ListingCard from '@/components/shared/product/listing-card';
import { getInStockRings, type CollectionRing } from '@/components/shared/home/in-stock-rings';
import { SECTION_IDS } from '@/components/shared/home/one-page';
import { getStoreCategories } from '@/lib/actions/category.actions';
import { localize, localizeProduct } from '@/lib/category';
import { conditionKey, SHOWS_PRICES } from '@/lib/constants';
import type { TranslationKey } from '@/lib/i18n-core';
import { getT } from '@/lib/i18n-server';
import { cn, timeAgo } from '@/lib/utils';

type Sort = 'newest' | 'lowest' | 'highest';

const SORTS: { id: Sort; label: TranslationKey }[] = [
  { id: 'newest', label: 'SORT_NEWEST' },
  { id: 'lowest', label: 'SORT_LOWEST' },
  { id: 'highest', label: 'SORT_HIGHEST' },
];

const SORTERS: Record<Sort, (a: CollectionRing, b: CollectionRing) => number> = {
  newest: (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  lowest: (a, b) => Number(a.price ?? 0) - Number(b.price ?? 0),
  highest: (a, b) => Number(b.price ?? 0) - Number(a.price ?? 0),
};

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sort?: string }>;
}

// Links are shared and edited by hand: an unknown order falls back to the newest first.
const readSort = (value?: string): Sort => (SHOWS_PRICES && SORTS.some(({ id }) => id === value) ? (value as Sort) : 'newest');

const chipClass = (isActive: boolean) =>
  cn(
    'shrink-0 rounded-full border px-4 py-2 text-sm transition',
    isActive
      ? 'border-primary bg-primary text-primary-foreground'
      : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground',
  );

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const [{ slug }, { locale }, categories] = await Promise.all([params, getT(), getStoreCategories()]);
  const category = categories.find((item) => item.slug === slug);
  return category ? { title: localize(category.name, locale) } : {};
}

/** Every product of one store category as a grid, newest first, with the other categories one tap away. */
export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const [{ slug }, { sort: sortParam }, { t, locale }, categories, products] = await Promise.all([
    params,
    searchParams,
    getT(),
    getStoreCategories(),
    getInStockRings(),
  ]);
  const category = categories.find((item) => item.slug === slug);
  if (!category) notFound();

  const sort = readSort(sortParam);
  const listings = products.filter((product) => product.categoryIds.includes(category.id)).sort(SORTERS[sort]);
  // Empty categories are never shown: an old link to one goes back to the categories.
  if (listings.length === 0) redirect(`/#${SECTION_IDS.showroom}`);
  const filledCategories = categories.filter((item) => products.some((product) => product.categoryIds.includes(item.id)));
  const now = new Date();
  const text = localize(category.text, locale);

  return (
    <div className='mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:py-10'>
      <Link
        href={`/?category=${category.slug}#${SECTION_IDS.showroom}`}
        className='inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground'
      >
        <ChevronLeft className='size-4' /> {t('CATEGORY_ALL')}
      </Link>

      <header className='space-y-2'>
        <div className='flex flex-wrap items-baseline gap-x-4 gap-y-1'>
          <h1 className='font-display text-4xl leading-tight sm:text-5xl'>{localize(category.name, locale)}</h1>
          <p className='text-sm text-muted-foreground'>{t('STORE_CATEGORY_RINGS', { count: listings.length })}</p>
        </div>
        {text && <p className='max-w-2xl text-muted-foreground'>{text}</p>}
      </header>

      <nav aria-label={t('CATEGORY_ALL')} className='-mx-4 flex gap-2 overflow-x-auto px-4 pb-1'>
        {filledCategories.map((item) => (
          <Link
            key={item.id}
            href={`/category/${item.slug}`}
            aria-current={item.id === category.id ? 'page' : undefined}
            className={chipClass(item.id === category.id)}
          >
            {localize(item.name, locale)}
          </Link>
        ))}
      </nav>

      {SHOWS_PRICES && listings.length > 1 && (
        <div role='group' aria-label={t('CATEGORY_SORT')} className='flex flex-wrap gap-2 border-t border-border pt-4'>
          {SORTS.map(({ id, label }) => (
            <Link
              key={id}
              href={id === 'newest' ? `/category/${category.slug}` : `/category/${category.slug}?sort=${id}`}
              aria-current={id === sort ? 'true' : undefined}
              className={cn(
                'rounded-full px-3 py-1.5 text-sm transition',
                id === sort ? 'bg-muted font-medium text-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {t(label)}
            </Link>
          ))}
        </div>
      )}

      <ul className='grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 sm:gap-x-4 lg:grid-cols-4 xl:grid-cols-5'>
        {listings.map((listing) => {
          const condition = conditionKey(listing.condition);
          return (
            <li key={listing.id}>
              <ListingCard
                href={`/product/${listing.slug}?c=${category.slug}`}
                name={localizeProduct(listing, locale).name}
                image={listing.image}
                price={listing.price}
                isReserved={listing.isReserved}
                reservedLabel={t('RESERVE_BADGE')}
                conditionLabel={condition && t(condition)}
                listedAgo={timeAgo(listing.createdAt, locale, now)}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
