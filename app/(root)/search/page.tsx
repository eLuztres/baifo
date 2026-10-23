import ProductCard, { type ProductCardData } from '@/components/shared/product/product-card';
import Pagination from '@/components/shared/pagination';
import { Button } from '@/components/ui/button';
import { getAllCategories, getAllProducts } from '@/lib/actions/product.actions';
import Link from 'next/link';
import { cn, formatCurrency, round2 } from '@/lib/utils';
import type { TranslationKey } from '@/lib/i18n-core';
import { getT } from '@/lib/i18n-server';
import { searchParamsSchema, type SearchParams } from '@/lib/validators';

const prices = [
  [1, 50],
  [51, 100],
  [101, 200],
  [201, 500],
  [501, 1000],
].map(([from, to]) => ({ from, to, value: `${from}-${to}` }));

const ratings = [4, 3, 2, 1];

const sortOrders: { id: SearchParams['sort']; labelKey: TranslationKey }[] = [
  { id: 'newest', labelKey: 'SORT_NEWEST' },
  { id: 'lowest', labelKey: 'SORT_LOWEST' },
  { id: 'highest', labelKey: 'SORT_HIGHEST' },
  { id: 'rating', labelKey: 'SORT_RATING' },
];

const filterLinkClass = (active: boolean) =>
  cn(
    'text-sm text-muted-foreground transition hover:text-foreground',
    active && 'font-semibold text-foreground'
  );

interface SearchPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

type FilterChanges = Partial<Pick<SearchParams, 'category' | 'price' | 'rating' | 'sort'>>;

// Links are shared and edited by hand: invalid values fall back to their defaults.
const readSearchParams = async (props: SearchPageProps) =>
  searchParamsSchema.parse(await props.searchParams);

export async function generateMetadata(props: SearchPageProps) {
  const [{ q, category, price, rating }, { t }] = await Promise.all([
    readSearchParams(props),
    getT(),
  ]);

  const isQuerySet = q !== 'all' && q !== '';
  const isCategorySet = category !== 'all' && category !== '';
  const isPriceSet = price !== 'all';
  const isRatingSet = rating !== 'all';

  if (isQuerySet || isCategorySet || isPriceSet || isRatingSet) {
    return {
      title: [
        isQuerySet && t('SEARCH_QUERY', { q }),
        isCategorySet && `${t('SEARCH_CATEGORY')}: ${category}`,
        isPriceSet && `${t('SEARCH_PRICE')}: ${price}`,
        isRatingSet && t('SEARCH_STARS_UP', { n: rating }),
      ]
        .filter(Boolean)
        .join(' · '),
    };
  }
  return { title: t('SEARCH_TITLE') };
}

const SearchPage = async (props: SearchPageProps) => {
  const { q, category, price, rating, sort, page } = await readSearchParams(props);

  const [products, categories, { t }] = await Promise.all([
    getAllProducts({ query: q, category, price, rating, sort, page }),
    getAllCategories(),
    getT(),
  ]);

  // No page param: a new filter or sort order starts again on page 1.
  const getFilterUrl = (changes: FilterChanges) =>
    `/search?${new URLSearchParams({ q, category, price, rating, sort, ...changes }).toString()}`;

  // Only what a card shows goes to the browser.
  const cards: ProductCardData[] = products.data.map((product) => ({
    id: product.id,
    name: product.name,
    slug: product.slug,
    category: product.category,
    price: round2(product.price).toFixed(2),
    images: product.images,
    stock: product.stock,
    reservedUntil: product.reservedUntil,
  }));

  const hasFilters =
    (q !== 'all' && q !== '') ||
    (category !== 'all' && category !== '') ||
    rating !== 'all' ||
    price !== 'all';

  return (
    <div className='grid gap-10 md:grid-cols-[220px_1fr]'>
      <aside className='space-y-8'>
        <div className='space-y-3'>
          <h2 className='font-sans text-xs font-medium uppercase tracking-[0.3em] text-foreground/60'>
            {t('SEARCH_CATEGORY')}
          </h2>
          <ul className='space-y-2'>
            <li>
              <Link
                className={filterLinkClass(category === 'all' || category === '')}
                href={getFilterUrl({ category: 'all' })}
              >
                {t('SEARCH_ANY')}
              </Link>
            </li>
            {categories.map((x) => (
              <li key={x.category}>
                <Link
                  className={filterLinkClass(category === x.category)}
                  href={getFilterUrl({ category: x.category })}
                >
                  {x.category}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className='space-y-3'>
          <h2 className='font-sans text-xs font-medium uppercase tracking-[0.3em] text-foreground/60'>
            {t('SEARCH_PRICE')}
          </h2>
          <ul className='space-y-2'>
            <li>
              <Link className={filterLinkClass(price === 'all')} href={getFilterUrl({ price: 'all' })}>
                {t('SEARCH_ANY')}
              </Link>
            </li>
            {prices.map((p) => (
              <li key={p.value}>
                <Link
                  className={filterLinkClass(price === p.value)}
                  href={getFilterUrl({ price: p.value })}
                >
                  {t('SEARCH_PRICE_RANGE', { from: formatCurrency(p.from), to: formatCurrency(p.to) })}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className='space-y-3'>
          <h2 className='font-sans text-xs font-medium uppercase tracking-[0.3em] text-foreground/60'>
            {t('SEARCH_RATING')}
          </h2>
          <ul className='space-y-2'>
            <li>
              <Link className={filterLinkClass(rating === 'all')} href={getFilterUrl({ rating: 'all' })}>
                {t('SEARCH_ANY')}
              </Link>
            </li>
            {ratings.map((r) => (
              <li key={r}>
                <Link
                  className={filterLinkClass(rating === r.toString())}
                  href={getFilterUrl({ rating: `${r}` })}
                >
                  {t('SEARCH_STARS_UP', { n: r })}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <div className='space-y-6'>
        <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
          <div className='flex flex-wrap items-center gap-2 text-sm'>
            {q !== 'all' && q !== '' && (
              <span className='rounded-full border border-border px-3 py-1'>{t('SEARCH_QUERY', { q })}</span>
            )}
            {category !== 'all' && category !== '' && (
              <span className='rounded-full border border-border px-3 py-1'>{`${t('SEARCH_CATEGORY')}: ${category}`}</span>
            )}
            {price !== 'all' && (
              <span className='rounded-full border border-border px-3 py-1'>{`${t('SEARCH_PRICE')}: ${price}`}</span>
            )}
            {rating !== 'all' && (
              <span className='rounded-full border border-border px-3 py-1'>{t('SEARCH_STARS_UP', { n: rating })}</span>
            )}
            {hasFilters && (
              <Button variant='link' asChild className='px-2'>
                <Link href='/search'>{t('SEARCH_CLEAR')}</Link>
              </Button>
            )}
          </div>
          <div className='flex flex-wrap items-center gap-1 text-sm'>
            <span className='mr-2 text-muted-foreground'>{t('SEARCH_SORT_BY')}</span>
            {sortOrders.map((s) => (
              <Link
                key={s.id}
                className={cn(
                  'rounded-full px-3 py-1 transition hover:bg-muted',
                  sort === s.id ? 'bg-muted text-foreground' : 'text-muted-foreground'
                )}
                href={getFilterUrl({ sort: s.id })}
              >
                {t(s.labelKey)}
              </Link>
            ))}
          </div>
        </div>
        {cards.length === 0 ? (
          <div className='rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground'>
            {t('NO_PRODUCTS')}
          </div>
        ) : (
          <div className='grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3'>
            {cards.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
        {products.totalPages > 1 && (
          <Pagination page={page} totalPages={products.totalPages} />
        )}
      </div>
    </div>
  );
};

export default SearchPage;
