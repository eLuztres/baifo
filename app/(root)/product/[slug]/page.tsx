import { cache } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, MapPin } from 'lucide-react';
import { getProductBySlug } from '@/lib/actions/product.actions';
import ProductPrice from '@/components/shared/product/product-price';
import ProductImages from '@/components/shared/product/product-images';
import BuyNowButton from '@/components/shared/product/buyNowButton';
import InterestButton from '@/components/shared/product/interest-button';
import ContactSellerButton from '@/components/shared/product/contact-seller-button';
import ShareButton from '@/components/shared/product/share-button';
import NextRingSwipe from '@/components/shared/product/next-ring-swipe';
import RelatedStrip from '@/components/shared/product/related-strip';
import { getInStockRings, inPlaces } from '@/components/shared/home/in-stock-rings';
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
import { getT } from '@/lib/i18n-server';
import { getShopPlaces, getVisitorPlaceIds } from '@/lib/places';
import { isReservationActive } from '@/lib/reservation';
import { localizeProduct } from '@/lib/category';
import { composeFeed } from '@/lib/feed';
import { jsonLd, listingJsonLd, metaDescription, pageAlternates } from '@/lib/seo';
import { cn } from '@/lib/utils';
import styles from './product-view.module.css';

/** How many similar listings the strip under a listing shows. */
const RELATED_COUNT = 8;

// generateMetadata and the page need the same row: one query per request.
const getProduct = cache(getProductBySlug);

interface ProductPageProps {
  params: Promise<{ slug: string }>;
  /** The store category the visitor is going through (`c`), for the next ring and the way back to it. */
  searchParams: Promise<{ c?: string }>;
}

export async function generateMetadata(props: ProductPageProps) {
  const { slug } = await props.params;
  const [product, { t, locale }] = await Promise.all([getProduct(slug), getT()]);
  if (!product) return { title: t('PRODUCT_FALLBACK_TITLE') };
  const { name, description } = localizeProduct(product, locale);
  return {
    title: t(product.kind === 'service' ? 'SERVICE_SEO_TITLE' : 'PRODUCT_SEO_TITLE', { name }),
    description: metaDescription(description) || undefined,
    alternates: await pageAlternates(`/product/${slug}`),
  };
}

const ProductDetailsPage = async (props: ProductPageProps) => {
  const [{ slug }, { c: categoryId }] = await Promise.all([props.params, props.searchParams]);

  const [product, session, { t, locale }, rings, categories, placeIds] = await Promise.all([
    getProduct(slug),
    getSession(),
    getT(),
    getInStockRings(),
    getStoreCategories(),
    getVisitorPlaceIds(),
  ]);
  if (!product) notFound();
  // The page itself always opens (a shared link); what it suggests next stays in the visitor's places.
  const visibleRings = inPlaces(rings, placeIds);
  const place = product.placeId ? (await getShopPlaces(locale)).find((item) => item.id === product.placeId) : undefined;

  const inStock = product.stock > 0;
  const isReserved = inStock && isReservationActive(product);
  const isMine = isReserved && product.reservedById === session?.user?.id;
  const reservedUntil = product.reservedUntil?.toISOString() ?? '';
  // Only what the buttons need goes to the browser (not e.g. who reserved the ring).
  const buyProduct = { id: product.id, stock: product.stock };
  const nextRing = findNextRing(groupByCategory(categories, visibleRings, locale), slug, categoryId);
  // Only whether there is a number goes to the browser; the number itself is fetched on "Contact seller".
  const hasSellerContact = Boolean(product.contactPhone);
  const isService = product.kind === 'service';
  const isIllustrative = rings.some((ring) => ring.slug === slug && ring.isIllustrative);
  const priceLabel = rings.some((ring) => ring.slug === slug && ring.isWanted) ? t('WANTED_BUDGET') : undefined;
  const condition = conditionKey(product.condition);
  const { name, description } = localizeProduct(product, locale);
  // The category the visitor came through, else the listing's own: the strip and the way back open with it.
  const focusCategory =
    categories.find((category) => category.slug === categoryId) ??
    categories.find((category) => rings.some((ring) => ring.slug === slug && ring.categoryIds.includes(category.id)));
  const feedHref = focusCategory ? `/explore?c=${focusCategory.slug}` : '/explore';
  const ownCategorySlug = (categoryIds: string[]) => categories.find((category) => categoryIds.includes(category.id))?.slug;
  const related = composeFeed(visibleRings.filter((ring) => ring.slug !== slug), focusCategory?.id, slug)
    .slice(0, RELATED_COUNT)
    .map((ring) => {
      // Its own category, so the next page's way back and swipe stay in it.
      const ringCategory = ownCategorySlug(ring.categoryIds);
      return {
        href: ringCategory ? `/product/${ring.slug}?c=${ringCategory}` : `/product/${ring.slug}`,
        name: localizeProduct(ring, locale).name,
        image: ring.image,
        price: ring.price,
        priceLabel: ring.isWanted ? t('WANTED_BUDGET') : undefined,
      };
    });

  return (
    <section className={cn(styles.view, 'flex flex-col gap-3 sm:gap-5')}>
      <script
        type='application/ld+json'
        // Safe: jsonLd escapes `<`, so the listing's own text can't end the script tag.
        dangerouslySetInnerHTML={{
          __html: jsonLd(
            listingJsonLd({
              name,
              description,
              images: product.images,
              category: product.category,
              path: `/product/${slug}`,
              isService,
              price: SHOWS_PRICES ? product.price?.toString() : undefined,
              condition: product.condition,
              isAvailable: SHOWCASE_MODE || inStock,
            })
          ),
        }}
      />
      {nextRing && BRAND.hasSwipeToNext && <NextRingSwipe href={`/product/${nextRing.slug}?c=${nextRing.categoryId}`} />}
      <Link
        href={feedHref}
        className='inline-flex shrink-0 items-center gap-1 self-start text-sm text-muted-foreground transition hover:text-foreground'
      >
        <ChevronLeft className='h-4 w-4' />
        {t('BACK_TO_SHOP')}
      </Link>

      {/* Phones stack photo and details; a long description scrolls inside its card. */}
      <div className='flex min-h-0 flex-1 flex-col gap-3 lg:grid lg:grid-cols-2 lg:grid-rows-[minmax(0,1fr)] lg:gap-12'>
        {/* A phone's photo gives way first (a third, a quarter on short screens), so title, price and the button always fit. */}
        <div className='relative min-h-[34%] flex-1 [@media(max-height:700px)]:min-h-[24%] sm:min-h-[50%] lg:min-h-0'>
          <ProductImages images={product.images} alt={name} />
          {isIllustrative && (
            <span className='pointer-events-none absolute right-3 top-3 z-10 rounded-full bg-background/90 px-2.5 py-1 text-xs shadow-sm'>
              {t('PRODUCT_ILLUSTRATIVE')}
            </span>
          )}
        </div>

        <div className='flex min-h-0 flex-col gap-3 lg:justify-center lg:gap-5'>
          <div className='relative flex min-h-0 flex-col gap-3 overflow-hidden rounded-3xl border border-primary/25 bg-card/70 p-4 shadow-2xl shadow-primary/10 backdrop-blur-md sm:gap-4 sm:p-7'>
            {/* A thin gold light along the top edge, like the rim of a jewellery box. */}
            <span
              aria-hidden='true'
              className='absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent'
            />
            <div className='flex shrink-0 items-start justify-between gap-2'>
              <h1 className='text-xl leading-tight sm:text-3xl'>{name}</h1>
              <ShareButton title={name} className='-mr-2 -mt-1' />
            </div>
            {(condition || place) && (
              <div className='flex shrink-0 flex-wrap gap-2'>
                {condition && <p className='w-fit rounded-full border border-border bg-muted px-3 py-1 text-sm'>{t(condition)}</p>}
                {place?.corralName ? (
                  <Link
                    href={`/corral/${place.slug}`}
                    className='inline-flex w-fit items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-sm text-primary transition hover:bg-primary/15'
                  >
                    <MapPin className='size-3.5' aria-hidden /> {place.corralName}
                  </Link>
                ) : (
                  place && (
                    <p className='inline-flex w-fit items-center gap-1 rounded-full border border-border bg-muted px-3 py-1 text-sm'>
                      <MapPin className='size-3.5 text-primary' aria-hidden /> {place.name}
                    </p>
                  )
                )}
              </div>
            )}
            {description && (
              <p className='min-h-0 overflow-y-auto overscroll-contain whitespace-pre-line text-sm leading-6 text-foreground/85 sm:text-base sm:leading-7'>
                {description}
              </p>
            )}
            {/* Showcase mode and services: no stock or buying, only a way to reach the maker, the seller or the person offering it. */}
            {SHOWCASE_MODE || isService ? (
              <>
                {SHOWS_PRICES && !isService && <ProductPrice value={Number(product.price)} label={priceLabel} />}
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
                  <ProductPrice value={Number(product.price)} label={priceLabel} />
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
          <RelatedStrip title={t('PRODUCT_RELATED_TITLE')} listings={related} seeAllHref={feedHref} seeAllLabel={t('CATEGORY_SEE_ALL')} />
        </div>
      </div>
    </section>
  );
};

export default ProductDetailsPage;
