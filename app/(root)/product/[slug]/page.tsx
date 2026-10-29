import { cache } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CalendarDays, ChevronLeft, MapPin, MessageCircle } from 'lucide-react';
import { getProductBySlug } from '@/lib/actions/product.actions';
import ProductPrice from '@/components/shared/product/product-price';
import ProductImages from '@/components/shared/product/product-images';
import BuyNowButton from '@/components/shared/product/buyNowButton';
import InterestButton from '@/components/shared/product/interest-button';
import ContactSellerButton from '@/components/shared/product/contact-seller-button';
import ShareButton from '@/components/shared/product/share-button';
import AdminEditButton from '@/components/shared/admin-edit-button';
import { Button } from '@/components/ui/button';
import NextRingSwipe from '@/components/shared/product/next-ring-swipe';
import ScrollText from '@/components/shared/product/scroll-text';
import { getInStockRings, getRingSummaries, inPlaces } from '@/components/shared/home/in-stock-rings';
import { findNextRing, orderByCategory } from '@/components/shared/home/materials';
import { getStoreCategories } from '@/lib/actions/category.actions';
import {
  CancelReservationButton,
  ReservationNotice,
  ReserveButton,
} from '@/components/shared/product/reserve-button';
import { getSession } from '@/lib/auth-guard';
import { BRAND } from '@/lib/brand';
import { APP_NAME, conditionKey, RESERVATION_HOURS, SERVER_URL, SHOWCASE_MODE, SHOWS_PRICES } from '@/lib/constants';
import { getT } from '@/lib/i18n-server';
import { sellerIdentity } from '@/lib/marketplace/seller';
import { getShopPlaces, getVisitorPlaceIds } from '@/lib/places';
import { isReservationActive } from '@/lib/reservation';
import { localizeProduct } from '@/lib/category';
import { getContactMessageTexts } from '@/lib/marketplace/contact-texts';
import { formatEventDate, isEventOver } from '@/lib/event-date';
import { serviceTypeKey, wantedBudgetKey } from '@/lib/listing-labels';
import { jsonLd, listingJsonLd, metaDescription, pageAlternates } from '@/lib/seo';
import { cn } from '@/lib/utils';
import styles from './product-view.module.css';
import { coverPicture } from '@/lib/video';


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
    title: t(product.type === 'SERVICE' ? 'SERVICE_SEO_TITLE' : 'PRODUCT_SEO_TITLE', { name }),
    description: metaDescription(description) || undefined,
    alternates: await pageAlternates(`/product/${slug}`),
  };
}

const ProductDetailsPage = async (props: ProductPageProps) => {
  const [{ slug }, { c: categoryId }] = await Promise.all([props.params, props.searchParams]);

  // Only the store's order (light) for the swipe to the next one, and this listing's own ring if it is in stock.
  const [product, session, { t, locale }, summaries, [ownRing], categories, placeIds] = await Promise.all([
    getProduct(slug),
    getSession(),
    getT(),
    getRingSummaries(),
    getInStockRings({ slug }),
    getStoreCategories(),
    getVisitorPlaceIds(),
  ]);
  if (!product) notFound();
  // The page itself always opens (a shared link); what it suggests next stays in the visitor's places.
  const visibleRings = inPlaces(summaries, placeIds);
  const place = product.placeId ? (await getShopPlaces(locale)).find((item) => item.id === product.placeId) : undefined;

  const inStock = product.stock > 0;
  const isReserved = inStock && isReservationActive(product);
  const isMine = isReserved && product.reservedById === session?.user?.id;
  const reservedUntil = product.reservedUntil?.toISOString() ?? '';
  // Only what the buttons need goes to the browser (not e.g. who reserved the ring).
  const buyProduct = { id: product.id, stock: product.stock };
  const nextRing = findNextRing(orderByCategory(categories, visibleRings), slug, categoryId);
  // Only whether there is a number goes to the browser; the number itself is fetched on "Contact seller".
  const hasSellerContact = Boolean(product.contactPhone);
  const isService = product.type === 'SERVICE';
  const isEvent = product.type === 'EVENT';
  // A shared link to a past event still opens, but without a way to sign up.
  const isOver = isEvent && product.startsAt !== null && isEventOver(product.startsAt);
  const serviceKey = isService ? serviceTypeKey(product.serviceType) : undefined;
  // 0 is no "from" price for a service and a free event.
  const hasPrice = SHOWS_PRICES && (product.type === 'PRODUCT' || product.type === 'WANTED' || Number(product.price) > 0);
  const isIllustrative = Boolean(ownRing?.isIllustrative);
  const priceLabel = product.type === 'WANTED' ? t(wantedBudgetKey(product.price?.toString(), product.priceMax?.toString())) : isService ? t('PRICE_FROM') : undefined;
  const condition = conditionKey(product.condition);
  const { name, description } = localizeProduct(product, locale);
  // No seller number (older listings): buyers write to the shop's WhatsApp, with the listing's name and link ready.
  // Writing to the place's Corral instead is parked for now (#131).
  const shopChatUrl =
    !hasSellerContact && BRAND.contact.whatsappUrl
      ? `${BRAND.contact.whatsappUrl}?text=${encodeURIComponent(
          t('CONTACT_CORRAL_MESSAGE', { to: APP_NAME, name, url: `${SERVER_URL}/product/${slug}` })
        )}`
      : undefined;
  // Who buyers write to, and their message already in the seller's language.
  const seller = product.submission && sellerIdentity(product.submission);
  const sellerMessageTexts = hasSellerContact ? getContactMessageTexts(product) : undefined;
  // The category the visitor came through, else the listing's own: the strip and the way back open with it.
  const focusCategory =
    categories.find((category) => category.slug === categoryId) ??
    categories.find((category) => ownRing?.categoryIds.includes(category.id));
  const feedHref = focusCategory ? `/explore?c=${focusCategory.slug}` : '/explore';

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
              // No product offer for an event; a schema.org Event could come later.
              isService: isService || isEvent,
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
        className='inline-flex shrink-0 items-center gap-1 self-start text-sm text-muted-foreground transition hover:text-foreground max-sm:hidden'
      >
        <ChevronLeft className='h-4 w-4' />
        {t('BACK_TO_SHOP')}
      </Link>

      {/* Phones stack photo and details; a long description scrolls inside its card. */}
      <div className='flex min-h-0 flex-1 flex-col gap-3 lg:grid lg:grid-cols-2 lg:grid-rows-[minmax(0,1fr)] lg:gap-12'>
        {/* Phones: the photo full width and edge to edge right under the header, the way back floating on it. */}
        <div className='relative max-sm:-mx-4 max-sm:-mt-8 sm:min-h-[50%] sm:flex-1 lg:min-h-0'>
          <Link
            href={feedHref}
            aria-label={t('BACK_TO_SHOP')}
            className='absolute left-3 top-3 z-10 flex size-9 items-center justify-center rounded-full bg-background/70 text-foreground shadow-sm backdrop-blur-sm sm:hidden'
          >
            <ChevronLeft className='size-5' aria-hidden />
          </Link>
          <ProductImages images={product.images} alt={name} stamp={product.type === 'PRODUCT' ? BRAND.stamp : undefined} />
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
              <div className='-mr-2 -mt-1 flex shrink-0'>
                <AdminEditButton productId={product.id} submissionId={product.submission?.id} />
                <ShareButton title={name} />
              </div>
            </div>
            {(condition || serviceKey || isEvent || place) && (
              <div className='flex shrink-0 flex-wrap gap-2'>
                {condition && <p className='w-fit rounded-full border border-border bg-muted px-3 py-1 text-sm'>{t(condition)}</p>}
                {serviceKey && <p className='w-fit rounded-full border border-border bg-muted px-3 py-1 text-sm'>{t(serviceKey)}</p>}
                {isEvent && product.startsAt && (
                  <p className='inline-flex w-fit items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-sm font-medium text-primary'>
                    <CalendarDays className='size-3.5' aria-hidden /> {formatEventDate(product.startsAt, locale, t('EVENT_TODAY'))}
                  </p>
                )}
                {isEvent && product.address && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(product.address)}`}
                    target='_blank'
                    rel='noopener noreferrer'
                    title={t('EVENT_MAP')}
                    className='inline-flex w-fit min-w-0 max-w-full items-center gap-1 rounded-full border border-border bg-muted px-3 py-1 text-sm transition hover:border-primary/40'
                  >
                    <MapPin className='size-3.5 shrink-0 text-primary' aria-hidden /> <span className='truncate'>{product.address}</span>
                  </a>
                )}
                {place && (
                  <p className='inline-flex w-fit items-center gap-1 rounded-full border border-border bg-muted px-3 py-1 text-sm'>
                    <MapPin className='size-3.5 text-primary' aria-hidden /> {place.name}
                  </p>
                )}
              </div>
            )}
            {description && (
              <ScrollText moreLabel={t('PRODUCT_DESCRIPTION_MORE')} className='text-sm leading-6 max-sm:max-h-36 text-foreground/85 sm:text-base sm:leading-7'>
                {description}
              </ScrollText>
            )}
            {/* Showcase mode and services: no stock or buying, only a way to reach the maker, the seller or the person offering it. */}
            {isOver ? (
              <p className='shrink-0 rounded-2xl bg-muted px-4 py-3 text-center text-sm text-muted-foreground'>{t('EVENT_OVER')}</p>
            ) : SHOWCASE_MODE || isService || isEvent ? (
              <>
                {hasPrice ? (
                  <ProductPrice value={Number(product.price)} maxValue={product.priceMax} label={priceLabel} />
                ) : (
                  isEvent && SHOWS_PRICES && <p className='text-2xl font-semibold'>{t('EVENT_FREE')}</p>
                )}
                {seller?.name && <p className='shrink-0 truncate text-sm text-muted-foreground'>{t('SELLER_OFFERED_BY', { name: seller.name })}</p>}
                <div className='flex shrink-0 items-center gap-2'>
                  {sellerMessageTexts ? (
                    <ContactSellerButton
                      productId={product.id}
                      messageTexts={sellerMessageTexts}
                      image={BRAND.contactImage}
                      className='flex-1 shrink-0'
                    />
                  ) : shopChatUrl ? (
                    <Button asChild className='h-11 flex-1 shrink-0 rounded-full'>
                      <a href={shopChatUrl} target='_blank' rel='noopener noreferrer'>
                        <MessageCircle /> {t('CONTACT_SELLER')}
                      </a>
                    </Button>
                  ) : (
                    // Only a shop without any WhatsApp number still asks for the visitor's contact.
                    <InterestButton
                      productId={product.id}
                      productName={name}
                      image={coverPicture(product.images)}
                      userName={session?.user?.name ?? undefined}
                      className='w-full'
                    />
                  )}
                </div>
              </>
            ) : (
              <>
                <div className='flex shrink-0 flex-wrap items-center gap-3'>
                  <ProductPrice value={Number(product.price)} maxValue={product.priceMax} label={priceLabel} />
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
