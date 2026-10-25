import { cache } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { getProductBySlug } from '@/lib/actions/product.actions';
import ProductPrice from '@/components/shared/product/product-price';
import ProductImages from '@/components/shared/product/product-images';
import BuyNowButton from '@/components/shared/product/buyNowButton';
import InterestButton from '@/components/shared/product/interest-button';
import ContactSellerButton from '@/components/shared/product/contact-seller-button';
import NextRingSwipe from '@/components/shared/product/next-ring-swipe';
import { getInStockRings } from '@/components/shared/home/in-stock-rings';
import { findNextRing, groupByCategory } from '@/components/shared/home/materials';
import { getStoreCategories } from '@/lib/actions/category.actions';
import {
  CancelReservationButton,
  ReservationNotice,
  ReserveButton,
} from '@/components/shared/product/reserve-button';
import { getSession } from '@/lib/auth-guard';
import { BRAND } from '@/lib/brand';
import { conditionKey, RESERVATION_HOURS, SHOWCASE_MODE, SHOWS_PRICES } from '@/lib/constants';
import { SECTION_IDS, sectionHref } from '@/components/shared/home/one-page';
import { getT } from '@/lib/i18n-server';
import { isReservationActive } from '@/lib/reservation';
import { localizeProduct } from '@/lib/category';
import { cn } from '@/lib/utils';
import styles from './product-view.module.css';

// generateMetadata and the page need the same row: one query per request.
const getProduct = cache(getProductBySlug);

interface ProductPageProps {
  params: Promise<{ slug: string }>;
  /** The store category the visitor is going through (`c`), for the next ring. */
  searchParams: Promise<{ c?: string }>;
}

export async function generateMetadata(props: ProductPageProps) {
  const { slug } = await props.params;
  const [product, { t, locale }] = await Promise.all([getProduct(slug), getT()]);
  return { title: product ? localizeProduct(product, locale).name : t('PRODUCT_FALLBACK_TITLE') };
}

const ProductDetailsPage = async (props: ProductPageProps) => {
  const [{ slug }, { c: categoryId }] = await Promise.all([props.params, props.searchParams]);

  const [product, session, { t, locale }, rings, categories] = await Promise.all([
    getProduct(slug),
    getSession(),
    getT(),
    getInStockRings(),
    getStoreCategories(),
  ]);
  if (!product) notFound();

  const inStock = product.stock > 0;
  const isReserved = inStock && isReservationActive(product);
  const isMine = isReserved && product.reservedById === session?.user?.id;
  const reservedUntil = product.reservedUntil?.toISOString() ?? '';
  // Only what the buttons need goes to the browser (not e.g. who reserved the ring).
  const buyProduct = { id: product.id, stock: product.stock };
  const nextRing = findNextRing(groupByCategory(categories, rings, locale), slug, categoryId);
  // Only whether there is a number goes to the browser; the number itself is fetched on "Contact seller".
  const hasSellerContact = Boolean(product.contactPhone);
  const condition = conditionKey(product.condition);
  const { name, description } = localizeProduct(product, locale);

  return (
    <section className={cn(styles.view, 'flex flex-col gap-3 sm:gap-5')}>
      {nextRing && BRAND.hasSwipeToNext && <NextRingSwipe href={`/product/${nextRing.slug}?c=${nextRing.categoryId}`} />}
      <Link
        href={sectionHref(SECTION_IDS.showroom)}
        className='inline-flex shrink-0 items-center gap-1 self-start text-sm text-muted-foreground transition hover:text-foreground'
      >
        <ChevronLeft className='h-4 w-4' />
        {t('BACK_TO_SHOP')}
      </Link>

      {/* Phones stack photo and details; the photo keeps at least half and a long description scrolls inside its card. */}
      <div className='flex min-h-0 flex-1 flex-col gap-3 lg:grid lg:grid-cols-2 lg:grid-rows-[minmax(0,1fr)] lg:gap-12'>
        <div className='min-h-[50%] flex-1 lg:min-h-0'>
          <ProductImages images={product.images} alt={name} />
        </div>

        <div className='flex min-h-0 flex-col lg:justify-center'>
          <div className='relative flex min-h-0 flex-col gap-3 overflow-hidden rounded-3xl border border-primary/25 bg-card/70 p-4 shadow-2xl shadow-primary/10 backdrop-blur-md sm:gap-4 sm:p-7'>
            {/* A thin gold light along the top edge, like the rim of a jewellery box. */}
            <span
              aria-hidden='true'
              className='absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent'
            />
            <h1 className='shrink-0 text-xl leading-tight sm:text-3xl'>{name}</h1>
            {condition && (
              <p className='w-fit shrink-0 rounded-full border border-border bg-muted px-3 py-1 text-sm'>{t(condition)}</p>
            )}
            {description && (
              <p className='min-h-0 overflow-y-auto overscroll-contain whitespace-pre-line text-sm leading-6 text-foreground/85 sm:text-base sm:leading-7'>
                {description}
              </p>
            )}
            {/* Showcase mode: no stock or buying, only a way to reach the maker, or the seller of a classified ad. */}
            {SHOWCASE_MODE ? (
              <>
                {SHOWS_PRICES && <ProductPrice value={Number(product.price)} />}
                {hasSellerContact ? (
                  <ContactSellerButton productId={product.id} productName={name} className='w-full' />
                ) : (
                  <InterestButton
                    productId={product.id}
                    productName={name}
                    image={product.images[0]}
                    userName={session?.user?.name ?? undefined}
                    className='w-full'
                  />
                )}
              </>
            ) : (
              <>
                <div className='flex shrink-0 flex-wrap items-center gap-3'>
                  <ProductPrice value={Number(product.price)} />
                  {!inStock ? (
                    <span className='rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground'>
                      {t('SOLD_OUT')}
                    </span>
                  ) : isReserved ? (
                    <span className='inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-primary'>
                      <span className='h-1.5 w-1.5 rounded-full bg-primary' />
                      <ReservationNotice until={reservedUntil} isMine={isMine} />
                    </span>
                  ) : (
                    <span className='inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary'>
                      <span className='h-1.5 w-1.5 rounded-full bg-primary' />
                      {t('IN_STOCK')}
                    </span>
                  )}
                </div>

                {/* Quiet "reserve" on the left, gold "buy" (the main action) on the right, side by side. */}
                {inStock && !isReserved && (
                  <div className='flex gap-3'>
                    <ReserveButton
                      productId={product.id}
                      productName={name}
                      userName={session?.user?.name ?? undefined}
                      hours={RESERVATION_HOURS}
                      variant='outline'
                      className='flex-1 border-primary/40 bg-background text-foreground hover:bg-background hover:text-primary'
                    />
                    <BuyNowButton product={buyProduct} className='h-11 flex-1 rounded-full' />
                  </div>
                )}

                {isReserved && !isMine && session?.user?.role === 'admin' && (
                  <CancelReservationButton productId={product.id} className='w-full' />
                )}

                {isMine && (
                  <div className='space-y-2'>
                    <BuyNowButton product={buyProduct} className='h-14 w-full rounded-full text-base' />
                    <CancelReservationButton productId={product.id} className='w-full' />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProductDetailsPage;
