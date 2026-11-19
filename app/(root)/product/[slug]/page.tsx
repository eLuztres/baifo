import { cache } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, CalendarDays, EyeOff, MapPin, MessageCircle, Repeat } from 'lucide-react';
import { getProductBySlug } from '@/lib/product';
import { getAdminProductPreview } from '@/lib/marketplace/admin-preview';
import { isAdminPreviewSlug } from '@/lib/marketplace/preview-slug';
import ProductPrice from '@/components/shared/product/product-price';
import ProductImages from '@/components/shared/product/product-images';
import { toPictureMotion } from '@/lib/picture-motion';
import InterestButton from '@/components/shared/product/interest-button';
import ContactSellerButton from '@/components/shared/product/contact-seller-button';
import ContactWaysButton from '@/components/shared/product/contact-ways-button';
import ShareButton from '@/components/shared/product/share-button';
import PrintButton from '@/components/shared/product/print-button';
import { MercadilloIcon } from '@/components/shared/mercadillo-row';
import { partnerListingsWhere, partnerPath } from '@/lib/partners';
import PrepareSharePreview from '@/components/shared/product/prepare-share-preview';
import ListingInfoButton from '@/components/shared/product/listing-info-button';
import AdminEditButton from '@/components/shared/admin-edit-button';
import { Button } from '@/components/ui/button';
import NextRingSwipe from '@/components/shared/product/next-ring-swipe';
import ScrollText from '@/components/shared/product/scroll-text';
import { getInStockRings, getRingSummaries, inPlaces } from '@/components/shared/home/in-stock-rings';
import { apartListingsWhere } from '@/lib/mercadillos';
import { findNextRing } from '@/components/shared/home/materials';
import {
  CancelReservationButton,
  ReservationNotice,
  ReserveButton,
} from '@/components/shared/product/reserve-button';
import { getSession } from '@/lib/auth-guard';
import { absoluteUrl, BRAND } from '@/lib/brand';
import { ANY_CONDITION, APP_NAME, conditionKey, RESERVATION_HOURS, SERVER_URL, SHOWCASE_MODE, SHOWS_PRICES } from '@/lib/constants';
import { getLocale, getPictureFallbackLocales, getT } from '@/lib/i18n-server';
import { withLang } from '@/lib/i18n-core';
import { sellerIdentity } from '@/lib/marketplace/seller';
import { getVisitorPlaceIds } from '@/lib/places';
import { isReservationActive } from '@/lib/reservation';
import TagBadges from '@/components/shared/product/tag-badges';
import type { TagNames } from '@/lib/tag-names';
import { localize, localizeProduct } from '@/lib/localize';
import { namedPhoto, printableMedia } from '@/lib/print';
import { getContactMessage } from '@/lib/marketplace/contact-texts';
import { formatEventDate, isEventOver } from '@/lib/event-date';
import { repeatOf } from '@/lib/event-repeat';
import EventRepeatDates from '@/components/shared/product/event-repeat-dates';
import { priceLabelKey, serviceTypeKey } from '@/lib/listing-labels';
import { breadcrumbJsonLd, eventJsonLd, jsonLd, listingJsonLd, listingMetaDescription, metaDescription, pageAlternates } from '@/lib/seo';
import type { TranslationKey } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import styles from './product-view.module.css';
import { coverPicture } from '@/lib/video';
import { listingPreviewPath } from '@/lib/share-preview';
import { localizePictures, toPictureLanguages } from '@/lib/marketplace/pictures';


// generateMetadata and the page need the same row: one query per request. An admin also sees a listing that isn't
// online (yet) here, at /product/vista-<id>, as visitors would.
const getProduct = cache(async (slug: string, foto?: string) => {
  const product = (await getProductBySlug(slug)) ?? ((await getAdminProductPreview(slug)) as unknown as Awaited<ReturnType<typeof getProductBySlug>>);
  if (!product) return null;
  // The pictures for the visitor's language, and a link's own photo (chosen among all on Share) first when it isn't one.
  const locale = await getLocale();
  const shown = localizePictures(product.images, product.pictureLanguages, locale, getPictureFallbackLocales());
  const named = namedPhoto(foto, product.images);
  const images = named && !shown.includes(named) ? [named, ...shown] : shown;
  const hasPictureLanguages = Object.keys(toPictureLanguages(product.pictureLanguages)).length > 0;
  // A named photo previews by its place among all, as Share prepared it; else this language's cover.
  const previewPath = named
    ? listingPreviewPath(slug, product.images, product.images.indexOf(named))
    : listingPreviewPath(slug, images, 0, hasPictureLanguages ? locale : undefined);
  return { ...product, images, allImages: product.images, startIndex: named ? images.indexOf(named) : 0, previewPath };
});

interface ProductPageProps {
  params: Promise<{ slug: string }>;
  /** `from`: the filters of the listings page they came from, for the way back. `foto`: the picture a shared link shows. */
  searchParams: Promise<{ from?: string; foto?: string }>;
}

// "Second hand" only where the seller's condition says so: a new or handmade item must not be called used.
function seoTitleKey({ type, condition }: { type: string; condition: string | null }): TranslationKey {
  if (type === 'SERVICE') return 'SERVICE_SEO_TITLE';
  if (type === 'EVENT') return 'EVENT_SEO_TITLE';
  const isUsed = type === 'PRODUCT' && condition && condition !== 'new' && condition !== ANY_CONDITION;
  return isUsed ? 'PRODUCT_USED_SEO_TITLE' : 'PRODUCT_SEO_TITLE';
}

export async function generateMetadata(props: ProductPageProps) {
  const [{ slug }, { foto }] = await Promise.all([props.params, props.searchParams]);
  const [product, { t, locale }] = await Promise.all([getProduct(slug, foto), getT()]);
  if (!product) return { title: t('PRODUCT_FALLBACK_TITLE') };
  const { name, description } = localizeProduct(product, locale);
  // An admin's look at a listing not online stays out of search engines.
  if (isAdminPreviewSlug(slug)) return { title: name, robots: { index: false } };
  const cover = coverPicture(product.images);
  return {
    title: t(seoTitleKey(product), { name }),
    description: listingMetaDescription(description, t('PRODUCT_SEO_SUFFIX')) || undefined,
    alternates: await pageAlternates(`/product/${slug}`),
    // A shared link shows the listing's own photo; openGraph replaces the layout's whole block, so it repeats the rest.
    ...(cover && {
      openGraph: {
        siteName: BRAND.name,
        title: name,
        description: metaDescription(description) || undefined,
        locale,
        images: [{ url: absoluteUrl(product.previewPath, SERVER_URL), width: 800, height: 800, type: 'image/jpeg' }],
      },
    }),
  };
}

const ProductDetailsPage = async (props: ProductPageProps) => {
  const [{ slug }, { from: fromFilters, foto }] = await Promise.all([props.params, props.searchParams]);

  // Only the store's order (light) for the swipe to the next one, and this listing's own ring if it is in stock.
  const [product, session, { t, locale }, summaries, [ownRing], placeIds] = await Promise.all([
    getProduct(slug, foto),
    getSession(),
    getT(),
    getRingSummaries({ NOT: { OR: [apartListingsWhere, partnerListingsWhere] } }),
    getInStockRings({ slug }),
    getVisitorPlaceIds(),
  ]);
  if (!product) notFound();
  // A listing of a "Solo aquí" selección leads on to the next one of those, never into the feed.
  const isApart = product.mercadillos.some((mercadillo) => mercadillo.isApart);
  // A partner's listing leads on to the next one of its mercadillo; the feed's never lead into one.
  const partnerId = product.submission?.partnerId;
  const nextRings = partnerId ? await getRingSummaries({ submission: { is: { partnerId } } }) : isApart ? await getRingSummaries(apartListingsWhere) : summaries;
  // The page itself always opens (a shared link); what it suggests next stays in the visitor's places.
  const visibleRings = inPlaces(nextRings, placeIds);

  const inStock = product.stock > 0;
  const isReserved = inStock && isReservationActive(product);
  const isMine = isReserved && product.reservedById === session?.user?.id;
  const reservedUntil = product.reservedUntil?.toISOString() ?? '';
  // Only what the buttons need goes to the browser (not e.g. who reserved the ring).
  const nextRing = findNextRing(visibleRings, slug);
  // Only whether there is a number goes to the browser; the number itself is fetched on "Contact seller".
  const hasSellerContact = Boolean(product.contactPhone);
  const isService = product.type === 'SERVICE';
  const isEvent = product.type === 'EVENT';
  // A shared link to a past event still opens, but without a way to sign up.
  const isOver = isEvent && product.startsAt !== null && isEventOver(product.startsAt);
  const repeat = isEvent ? repeatOf(product.submission) : null;
  const DateIcon = repeat ? Repeat : CalendarDays;
  const serviceKey = isService ? serviceTypeKey(product.serviceType) : undefined;
  // No price at all, and 0 (a free event), show no amount.
  const hasPrice = SHOWS_PRICES && product.priceMode !== 'NONE' && Number(product.price) > 0;
  const isIllustrative = Boolean(ownRing?.isIllustrative);
  const priceLabelText = priceLabelKey(product.type, product.priceMode);
  const priceLabel = priceLabelText && t(priceLabelText);
  // Only an item for sale has a condition: the AI may still read one for a wanted ad or an event.
  const condition = product.type === 'PRODUCT' ? conditionKey(product.condition) : undefined;
  const { name, description } = localizeProduct(product, locale);
  // No seller number (older listings): buyers write to the shop's WhatsApp, with the listing's name and link ready.
  // Writing to the place's Corral instead is parked for now (#131).
  const shopChatUrl =
    !hasSellerContact && BRAND.contact.whatsappUrl
      ? `${BRAND.contact.whatsappUrl}?text=${encodeURIComponent(
          t('CONTACT_CORRAL_MESSAGE', { to: APP_NAME, name, url: `${SERVER_URL}${withLang(`/product/${slug}`, locale)}` })
        )}`
      : undefined;
  // Who buyers write to, and their message already in the seller's language.
  const seller = product.submission && sellerIdentity(product.submission);
  const mercadillos = product.mercadillos.map((mercadillo) => ({ ...mercadillo, name: localize(mercadillo.name, locale) }));
  const partner = product.submission?.partner;
  const sellerMessage = hasSellerContact ? getContactMessage(product, seller?.name) : undefined;
  // Email, web and Instagram besides the WhatsApp; only whether there is an email goes to the browser.
  const contactWays = product.submission && {
    hasEmail: Boolean(product.submission.contactEmail),
    web: product.submission.contactWeb,
    instagram: product.submission.contactInstagram,
  };
  const hasContactWays = Boolean(contactWays && (contactWays.hasEmail || contactWays.web || contactWays.instagram));
  // The way back restores the visitor's own filters: opening a listing never sets one.
  const feedHref = fromFilters ? `/explore?${fromFilters}` : '/explore';
  // Phones put the description in a pop-up beside the contact button; without that row it stays on the page.
  const hasInfoRow = !isOver && (SHOWCASE_MODE || isService || isEvent);
  const phoneOnlyOnBig = hasInfoRow && 'max-sm:hidden';
  const mapHref = product.address && `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(product.address)}`;

  const path = `/product/${slug}`;
  // Share offers every picture, whatever the language.
  const previewPaths =
    !isAdminPreviewSlug(slug) && coverPicture(product.images) ? product.allImages.map((_, index) => listingPreviewPath(slug, product.allImages, index)) : undefined;
  const price = SHOWS_PRICES ? product.price?.toString() : undefined;
  const pageSchema =
    isEvent && product.startsAt
      ? eventJsonLd({ name, description, images: product.images, path, startsAt: product.startsAt, address: product.address, price })
      : listingJsonLd({
          name,
          description,
          images: product.images,
          path,
          isService: isService || isEvent,
          price,
          condition: product.condition,
          isAvailable: SHOWCASE_MODE || inStock,
        });
  const searchSchemas = [
    // A wanted ad isn't for sale: described as a product, Google would show its budget as a price.
    ...(product.type === 'WANTED' ? [] : [pageSchema]),
    breadcrumbJsonLd([
      { name: t('EXPLORE_TITLE'), path: '/explore' },
      { name, path },
    ]),
  ];

  return (
    <section className={cn(styles.view, 'flex flex-col gap-3 sm:gap-5')}>
      {searchSchemas.map((schema, index) => (
        <script
          key={index}
          type='application/ld+json'
          // Safe: jsonLd escapes `<`, so the listing's own text can't end the script tag.
          dangerouslySetInnerHTML={{ __html: jsonLd(schema) }}
        />
      ))}
      {previewPaths && <PrepareSharePreview src={product.previewPath} />}
      {nextRing && BRAND.hasSwipeToNext && <NextRingSwipe href={`/product/${nextRing}${fromFilters ? `?from=${encodeURIComponent(fromFilters)}` : ''}`} />}
      {/* Phones: one screen, the photo then title, price and buttons; the description opens in a pop-up. */}
      <div className='flex min-h-0 flex-1 flex-col gap-3 lg:grid lg:grid-cols-2 lg:grid-rows-[minmax(0,1fr)] lg:gap-12'>
        {/* Phones: the photo full width and edge to edge right under the header, the way back floating on it. */}
        <div className={cn(styles.photo, 'relative max-sm:-mx-4 max-sm:-mt-8 sm:min-h-[50%] sm:flex-1 lg:min-h-0')}>
          <Link
            href={feedHref}
            aria-label={t('BACK_TO_SHOP')}
            className={styles.backButton}
          >
            <ArrowLeft strokeWidth={2.4} aria-hidden />
          </Link>
          {/* Only the admin gets here before it's online: the photo says so, on phones too. */}
          {isAdminPreviewSlug(slug) && (
            <p className='absolute left-1/2 top-3 z-10 inline-flex max-w-[calc(100%-10rem)] -translate-x-1/2 items-center gap-1.5 rounded-full bg-background/80 px-3 py-1.5 text-xs font-medium shadow-sm backdrop-blur-sm sm:text-sm'>
              <EyeOff className='size-4 shrink-0' aria-hidden /> {t('PRODUCT_ADMIN_PREVIEW')}
            </p>
          )}
          <ProductImages
            images={product.images}
            alt={name}
            stamp={product.type === 'PRODUCT' ? BRAND.stamp : undefined}
            aiLabel={isIllustrative ? t('PRODUCT_ILLUSTRATIVE') : undefined}
            phoneClassName={styles.phonePicture}
            motion={toPictureMotion(product.pictureMotion)}
            startIndex={product.startIndex}
          />
        </div>

        <div className={cn(styles.details, 'flex min-h-0 flex-col gap-3 max-sm:flex-[1_0_auto] max-sm:justify-center lg:justify-center lg:gap-5')}>
          {/* Phones: no card around it, just the text under the photo. */}
          <div className='relative flex min-h-0 flex-col gap-3 overflow-hidden rounded-3xl border border-primary/25 bg-card/70 p-4 shadow-2xl shadow-primary/10 backdrop-blur-md max-sm:gap-2 max-sm:border-0 max-sm:bg-transparent max-sm:px-1 max-sm:py-0 max-sm:shadow-none max-sm:backdrop-blur-none sm:gap-4 sm:p-7'>
            {/* A thin gold light along the top edge, like the rim of a jewellery box. */}
            <span
              aria-hidden='true'
              className='absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent max-sm:hidden'
            />
            <div className='flex shrink-0 items-start justify-between gap-2'>
              <h1 className='line-clamp-2 text-xl leading-tight sm:line-clamp-none sm:text-3xl'>{name}</h1>
              <div className='-mr-2 -mt-1 flex shrink-0'>
                <AdminEditButton productId={product.id} submissionId={product.submission?.id} partnerId={product.submission?.partnerId} />
                <ShareButton title={name} photos={product.allImages} previewPaths={previewPaths} className={cn(phoneOnlyOnBig)} />
                {!isAdminPreviewSlug(slug) && <PrintButton slug={slug} label={t('PRINT')} photos={printableMedia(product.allImages)} />}
              </div>
            </div>
            <TagBadges tags={(product.submission?.tags ?? []).map((tag) => ({ id: tag.id, names: tag.names as TagNames }))} locale={locale} isLinked className='shrink-0' />
            {(condition || serviceKey || isEvent || mercadillos.length > 0 || partner) && (
              <div className='flex shrink-0 flex-wrap gap-2'>
                {/* A partner's listing leads back to its mercadillo, where its other listings are. */}
                {partner && (
                  <Link
                    href={partnerPath(partner.slug)}
                    className='inline-flex w-fit min-w-0 max-w-full items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 py-1 pl-1.5 pr-3 text-sm transition hover:border-primary'
                  >
                    <MercadilloIcon src={partner.icon} className='size-5' /> <span className='truncate'>{t('PARTNER_NAMED', { name: localize(partner.name, locale) })}</span>
                  </Link>
                )}
                {/* With several, only their names: the chips stay on one line on phones. */}
                {mercadillos.map((mercadillo) => (
                  <Link
                    key={mercadillo.slug}
                    href={`/explore?seleccion=${mercadillo.slug}`}
                    className='inline-flex w-fit min-w-0 max-w-full items-center gap-1.5 rounded-full border border-border bg-muted py-1 pl-1.5 pr-3 text-sm transition hover:border-primary/50'
                  >
                    <MercadilloIcon src={mercadillo.icon} className='size-5' /> <span className='truncate'>{mercadillos.length > 1 ? mercadillo.name : t('MERCADILLO_NAMED', { name: mercadillo.name })}</span>
                  </Link>
                ))}
                {condition && <p className={cn('w-fit rounded-full border border-border bg-muted px-3 py-1 text-sm', phoneOnlyOnBig)}>{t(condition)}</p>}
                {serviceKey && <p className={cn('w-fit rounded-full border border-border bg-muted px-3 py-1 text-sm', phoneOnlyOnBig)}>{t(serviceKey)}</p>}
                {isEvent && product.startsAt && (
                  <p className='inline-flex w-fit items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-sm font-medium text-primary'>
                    <DateIcon className='size-3.5' aria-hidden /> {formatEventDate(product.startsAt, locale, t('EVENT_TODAY'))}
                  </p>
                )}
                {repeat && !isOver && <EventRepeatDates repeat={repeat} locale={locale} t={t} className={cn('basis-full', phoneOnlyOnBig)} />}
                {isEvent && mapHref && (
                  <a
                    href={mapHref}
                    target='_blank'
                    rel='noopener noreferrer'
                    title={t('EVENT_MAP')}
                    className={cn('inline-flex w-fit min-w-0 max-w-full items-center gap-1 rounded-full border border-border bg-muted px-3 py-1 text-sm transition hover:border-primary/40', phoneOnlyOnBig)}
                  >
                    <MapPin className='size-3.5 shrink-0 text-primary' aria-hidden /> <span className='truncate'>{product.address}</span>
                  </a>
                )}
              </div>
            )}
            {description && (
              <ScrollText
                moreLabel={t('PRODUCT_DESCRIPTION_MORE')}
                className='text-sm leading-6 text-foreground/85 sm:text-base sm:leading-7'
                boxClassName={cn(phoneOnlyOnBig)}
              >
                {description}
              </ScrollText>
            )}
            {/* Showcase mode and services: no stock or buying, only a way to reach the maker, the seller or the person offering it. */}
            {isOver ? (
              <p className='shrink-0 rounded-2xl bg-muted px-4 py-3 text-center text-sm text-muted-foreground'>{t('EVENT_OVER')}</p>
            ) : SHOWCASE_MODE || isService || isEvent ? (
              <>
                {hasPrice ? (
                  <ProductPrice value={Number(product.price)} label={priceLabel} />
                ) : (
                  isEvent && SHOWS_PRICES && <p className='text-2xl font-semibold'>{t('EVENT_FREE')}</p>
                )}
                {seller?.name && <p className='shrink-0 truncate text-sm text-muted-foreground'>{t('SELLER_OFFERED_BY', { name: seller.name })}</p>}
                <div className='flex shrink-0 items-center gap-2'>
                  <ListingInfoButton title={name} label={t('PRODUCT_DESCRIPTION')} closeLabel={t('CLOSE')} className='sm:hidden'>
                    {isEvent && product.startsAt && (
                      <p className='mb-1 flex items-center gap-2 font-medium text-primary'>
                        <DateIcon className='size-4 shrink-0' aria-hidden /> {formatEventDate(product.startsAt, locale, t('EVENT_TODAY'))}
                      </p>
                    )}
                    {repeat && <EventRepeatDates repeat={repeat} locale={locale} t={t} className='mb-3' />}
                    {isEvent && mapHref && (
                      <a href={mapHref} target='_blank' rel='noopener noreferrer' className='mb-3 flex items-center gap-2 text-primary underline-offset-4 hover:underline'>
                        <MapPin className='size-4 shrink-0' aria-hidden /> {product.address}
                      </a>
                    )}
                    {(condition || serviceKey) && (
                      <span className='mb-3 flex flex-wrap gap-2 text-sm'>
                        {condition && <span className='rounded-full border border-border bg-muted px-3 py-1'>{t(condition)}</span>}
                        {serviceKey && <span className='rounded-full border border-border bg-muted px-3 py-1'>{t(serviceKey)}</span>}
                      </span>
                    )}
                    {description && <span className='block whitespace-pre-line'>{description}</span>}
                  </ListingInfoButton>
                  {contactWays && hasContactWays ? (
                    <ContactWaysButton productId={product.id} message={sellerMessage} sellerName={seller?.name} {...contactWays} className='flex-1 shrink-0' />
                  ) : sellerMessage ? (
                    <ContactSellerButton
                      productId={product.id}
                      message={sellerMessage}
                      className='flex-1 shrink-0'
                    />
                  ) : isApart ? null : shopChatUrl ? (
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
                  <ShareButton title={name} photos={product.allImages} previewPaths={previewPaths} className='size-12 border border-border bg-card text-foreground sm:hidden [&_svg]:size-5' />
                </div>
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
                  </div>
                )}

                {isReserved && !isMine && session?.user?.role === 'admin' && (
                  <CancelReservationButton productId={product.id} className='w-full' />
                )}

                {isMine && (
                  <div className='space-y-2'>
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
