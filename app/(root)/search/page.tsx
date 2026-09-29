import ProductCard from '@/components/shared/product/product-card';
import { Button } from '@/components/ui/button';
import {
  getAllProducts,
  // getAllCategories,
} from '@/lib/actions/product.actions';
import Link from 'next/link';
import { cn, convertToPlainObject, formatCurrency } from '@/lib/utils';
import type { TranslationKey } from '@/lib/i18n';
import { getT } from '@/lib/i18n-server';

const prices = [
  [1, 50],
  [51, 100],
  [101, 200],
  [201, 500],
  [501, 1000],
].map(([from, to]) => ({ from, to, value: `${from}-${to}` }));

const ratings = [4, 3, 2, 1];

const sortOrders: { id: string; labelKey: TranslationKey }[] = [
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

export async function generateMetadata(props: {
  searchParams: Promise<{
    q: string;
    category: string;
    price: string;
    rating: string;
  }>;
}) {
  const {
    q = 'all',
    category = 'all',
    price = 'all',
    rating = 'all',
  } = await props.searchParams;
  const { t } = await getT();

  const isQuerySet = q && q !== 'all' && q.trim() !== '';
  const isCategorySet =
    category && category !== 'all' && category.trim() !== '';
  const isPriceSet = price && price !== 'all' && price.trim() !== '';
  const isRatingSet = rating && rating !== 'all' && rating.trim() !== '';

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


const SearchPage = async (props: {
  searchParams: Promise<{
    q?: string;
    category?: string;
    price?: string;
    rating?: string;
    sort?: string;
    page?: string;
  }>;
}) => {
  const {
    q = 'all',
    category = 'all',
    price = 'all',
    rating = 'all',
    sort = 'newest',
    page = '1',
  } = await props.searchParams;

  const { t } = await getT();

  // Construct filter url
  const getFilterUrl = ({
    c,
    p,
    s,
    r,
    pg,
  }: {
    c?: string;
    p?: string;
    s?: string;
    r?: string;
    pg?: string;
  }) => {
    const params = { q, category, price, rating, sort, page };

    if (c) params.category = c;
    if (p) params.price = p;
    if (s) params.sort = s;
    if (r) params.rating = r;
    if (pg) params.page = pg;

    return `/search?${new URLSearchParams(params).toString()}`;
  };



























  const products = await getAllProducts({
    query: q,
    category,
    price,
    rating,
    sort,
    page: Number(page),
  });

  // const categories = await getAllCategories();

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
                href={getFilterUrl({ c: 'all' })}
              >
                {t('SEARCH_ANY')}
              </Link>
            </li>
          </ul>
        </div>

        <div className='space-y-3'>
          <h2 className='font-sans text-xs font-medium uppercase tracking-[0.3em] text-foreground/60'>
            {t('SEARCH_PRICE')}
          </h2>
          <ul className='space-y-2'>
            <li>
              <Link className={filterLinkClass(price === 'all')} href={getFilterUrl({ p: 'all' })}>
                {t('SEARCH_ANY')}
              </Link>
            </li>
            {prices.map((p) => (
              <li key={p.value}>
                <Link
                  className={filterLinkClass(price === p.value)}
                  href={getFilterUrl({ p: p.value })}
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
              <Link className={filterLinkClass(rating === 'all')} href={getFilterUrl({ r: 'all' })}>
                {t('SEARCH_ANY')}
              </Link>
            </li>
            {ratings.map((r) => (
              <li key={r}>
                <Link
                  className={filterLinkClass(rating === r.toString())}
                  href={getFilterUrl({ r: `${r}` })}
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
                href={getFilterUrl({ s: s.id })}
              >
                {t(s.labelKey)}
              </Link>
            ))}
          </div>
        </div>
        {products.data.length === 0 ? (
          <div className='rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground'>
            {t('NO_PRODUCTS')}
          </div>
        ) : (
          <div className='grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3'>
            {convertToPlainObject(products.data).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchPage;
