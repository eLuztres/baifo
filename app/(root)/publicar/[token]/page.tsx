import type { Metadata } from 'next';
import { cache } from 'react';
import Link from 'next/link';
import { CalendarDays, CheckCircle2, Eye, MapPin } from 'lucide-react';
import ProductImages from '@/components/shared/product/product-images';
import ProductPrice from '@/components/shared/product/product-price';
import ScrollText from '@/components/shared/product/scroll-text';
import { Button } from '@/components/ui/button';
import { absoluteUrl, BRAND } from '@/lib/brand';
import { localize } from '@/lib/category';
import { SHOP_TIME_ZONE } from '@/lib/constants/currency';
import type { ListingTranslations } from '@/lib/marketplace/catalog';
import { BIZUM_PHONE, LISTING_DAYS, LISTING_PAYMENT_METHODS, LISTING_PRICES, UNPAID_LISTING_HOURS } from '@/lib/marketplace/config';
import { fill, publishPageTexts } from '@/lib/marketplace/page-texts';
import { getListingPreview as loadListingPreview } from '@/lib/marketplace/preview';
import { conditionKey, SERVER_URL } from '@/lib/constants';
import { formatEventDate } from '@/lib/event-date';
import { getT } from '@/lib/i18n-server';
import { priceLabelKey, serviceTypeKey } from '@/lib/listing-labels';
import { getShopPlaces } from '@/lib/places';
import ListingActions from './listing-actions';
import PublishForm from './publish-form';
import ShopTeaser from './shop-teaser';
import { coverPicture } from '@/lib/video';
import { metaDescription } from '@/lib/seo';

// A private link: no search engine should list or follow it.
interface PublishPageProps {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ pagado?: string; borrado?: string }>;
}

// generateMetadata and the page need the same row: one query per request.
const getListingPreview = cache(loadListingPreview);

/** The link sent to the person shows their listing's title and photo in WhatsApp, not the shop's logo. */
export async function generateMetadata({ params }: PublishPageProps): Promise<Metadata> {
  const [{ token }, { locale }] = await Promise.all([params, getT()]);
  const robots = { index: false, follow: false };
  const listing = await getListingPreview(token);
  if (!listing) return { title: BRAND.name, robots };
  const translation = (listing.translations as ListingTranslations)[locale];
  const title = translation?.title || listing.title || BRAND.name;
  const description = metaDescription(translation?.description || listing.description || '') || undefined;
  const cover = coverPicture(listing.images.length > 0 ? listing.images : listing.rawImages);
  return {
    title,
    description,
    robots,
    openGraph: { siteName: BRAND.name, title, description, locale, ...(cover && { images: [absoluteUrl(cover, SERVER_URL)] }) },
  };
}

const CHIP_CLASS = 'inline-flex w-fit min-w-0 max-w-full items-center gap-1 rounded-full border border-border bg-muted px-3 py-1 text-sm';

/** The person's private page: their listing as it will look, their OK to show their number, the plan and how to pay. */
export default async function PublishPage({ params, searchParams }: PublishPageProps) {
  const [{ token }, { pagado, borrado }, { t, locale }] = await Promise.all([params, searchParams, getT()]);
  const texts = publishPageTexts(locale);
  const listing = await getListingPreview(token);

  if (!listing) {
    // Deleted by the person a moment ago: the link is gone, but they hear it went well.
    return <p className='mx-auto max-w-xl py-16 text-center text-muted-foreground'>{borrado ? texts.manageDeleted : texts.unavailable}</p>;
  }

  const isLive = listing.status === 'LIVE';
  const isEnded = listing.status === 'EXPIRED';
  const isClosed = listing.status === 'SOLD' || listing.status === 'CANCELLED';
  // The person sees the listing in their language; the shop language's text is the fallback.
  const translation = (listing.translations as ListingTranslations)[locale];
  const title = translation?.title || listing.title || '';
  const description = translation?.description || listing.description;
  // Only an item for sale has a condition: the AI may still read one for a wanted ad or an event.
  const condition = listing.type === 'PRODUCT' ? conditionKey(listing.condition) : undefined;
  const serviceKey = listing.type === 'SERVICE' ? serviceTypeKey(listing.serviceType) : undefined;
  const isEvent = listing.type === 'EVENT';
  const place = listing.place ? (await getShopPlaces(locale)).find((item) => item.id === listing.place?.id) : undefined;
  // As on the product page: no price at all, and 0 (a free event), show no amount.
  const hasPrice = listing.priceMode !== 'NONE' && Number(listing.price) > 0;
  const priceLabelText = priceLabelKey(listing.type, listing.priceMode);
  const priceLabel = priceLabelText && t(priceLabelText);
  const corral = listing.place?.corral;
  // Until when the person can still pay: the link stops working this long after it was sent.
  const validUntil = listing.sentAt
    ? new Date(listing.sentAt.getTime() + UNPAID_LISTING_HOURS * 3600_000).toLocaleString(locale, {
        timeZone: SHOP_TIME_ZONE,
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';
  const endDate = listing.expiresAt?.toLocaleDateString(locale, { timeZone: SHOP_TIME_ZONE, day: 'numeric', month: 'long' }) ?? '';
  const payment = {
    methods: LISTING_PAYMENT_METHODS,
    bizumPhone: BIZUM_PHONE,
    code: listing.payCode ?? '',
    corral: corral && {
      name: corral.name,
      address: corral.address,
      hours: localize(corral.hours, locale),
      mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([corral.venue, corral.address].filter(Boolean).join(', '))}`,
    },
    validUntil,
    helpUrl: BRAND.contact.whatsappUrl,
  };
  return (
    <section className='mx-auto grid max-w-5xl grid-cols-1 gap-6 py-6 lg:grid-cols-2 lg:gap-12'>
      <div className='relative aspect-square'>
        <ProductImages images={listing.images.length > 0 ? listing.images : listing.rawImages} alt={title} />
        {/* Centered: a portrait photo is narrower than its square, so a corner badge would float beside it. */}
        {!isLive && !isClosed && (
          <span className='pointer-events-none absolute left-1/2 top-3 z-10 inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-background/90 px-3 py-1 text-xs font-medium shadow-sm'>
            <Eye className='size-3.5 text-primary' aria-hidden /> {texts.previewBadge}
          </span>
        )}
      </div>

      <div className='min-w-0 space-y-6'>
        <div className='space-y-3 rounded-3xl border border-primary/25 bg-card/70 p-4 shadow-2xl shadow-primary/10 sm:p-7'>
          <p className='eyebrow'>{texts.title}</p>
          <h1 className='text-xl leading-tight sm:text-3xl'>{title}</h1>
          {(condition || serviceKey || isEvent || place) && (
            <div className='flex flex-wrap gap-2'>
              {condition && <p className={CHIP_CLASS}>{t(condition)}</p>}
              {serviceKey && <p className={CHIP_CLASS}>{t(serviceKey)}</p>}
              {isEvent && listing.startsAt && (
                <p className='inline-flex w-fit items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-sm font-medium text-primary'>
                  <CalendarDays className='size-3.5' aria-hidden /> {formatEventDate(listing.startsAt, locale, t('EVENT_TODAY'))}
                </p>
              )}
              {isEvent && listing.address && (
                <p className={CHIP_CLASS}>
                  <MapPin className='size-3.5 shrink-0 text-primary' aria-hidden /> <span className='truncate'>{listing.address}</span>
                </p>
              )}
              {place && (
                <p className={CHIP_CLASS}>
                  <MapPin className='size-3.5 shrink-0 text-primary' aria-hidden /> {place.name}
                </p>
              )}
            </div>
          )}
          {description && (
            <ScrollText moreLabel={t('PRODUCT_DESCRIPTION_MORE')} className='text-sm leading-6 text-foreground/85 sm:text-base sm:leading-7'>
              {description}
            </ScrollText>
          )}
          {hasPrice ? (
            <ProductPrice value={Number(listing.price)} label={priceLabel} />
          ) : (
            isEvent && <p className='text-2xl font-semibold'>{t('EVENT_FREE')}</p>
          )}
        </div>

        {isEnded ? (
          <>
            <p className='rounded-3xl border border-border bg-muted p-6'>
              {fill(texts.endedOnAsk, { date: endDate })}
              {BRAND.contact.whatsappUrl && (
                <a href={BRAND.contact.whatsappUrl} target='_blank' rel='noopener noreferrer' className='mt-3 flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline'>
                  {texts.askUs}
                </a>
              )}
            </p>
            <ShopTeaser texts={texts} />
          </>
        ) : isClosed ? (
          <>
            <p role='status' className='flex items-start gap-2 rounded-3xl border border-primary/30 bg-card p-5 sm:p-6'>
              <CheckCircle2 className='mt-0.5 size-5 shrink-0 text-primary' aria-hidden /> {listing.status === 'CANCELLED' ? texts.closedCancelled : texts.closedSold}
            </p>
            <ShopTeaser texts={texts} />
          </>
        ) : listing.status === 'HIDDEN' ? (
          <>
            <ListingActions token={token} texts={texts} type={listing.type} isHidden />
            <ShopTeaser texts={texts} ownSlug={listing.product?.slug} />
          </>
        ) : isLive || pagado ? (
          <>
            <div className='space-y-4 rounded-3xl border border-primary/30 bg-primary/10 p-6'>
              <p>{isLive ? (endDate ? fill(texts.liveUntil, { date: endDate }) : texts.live) : texts.paid}</p>
              {listing.product && (
                <Button asChild className='rounded-full'>
                  <Link href={`/product/${listing.product.slug}`}>{texts.viewListing}</Link>
                </Button>
              )}
            </div>
            {isLive && <ListingActions token={token} texts={texts} type={listing.type} isHidden={false} />}
            <ShopTeaser texts={texts} ownSlug={listing.product?.slug} />
          </>
        ) : (
          <>
            <p className='text-muted-foreground'>{texts.intro}</p>
            <PublishForm
              token={token}
              texts={texts}
              prices={LISTING_PRICES}
              days={LISTING_DAYS}
              initial={{ isConfirmed: Boolean(listing.consentAt), claimedMethod: listing.payClaimedMethod === 'cash' ? 'cash' : listing.payClaimedMethod === 'bizum' ? 'bizum' : null }}
              payment={payment}
              shopTeaser={<ShopTeaser texts={texts} />}
              hasPayment={false}
            />
          </>
        )}
      </div>
    </section>
  );
}
