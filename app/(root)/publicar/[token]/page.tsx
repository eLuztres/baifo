import type { Metadata } from 'next';
import Link from 'next/link';
import { CalendarDays, Eye, MapPin } from 'lucide-react';
import ProductImages from '@/components/shared/product/product-images';
import ProductPrice from '@/components/shared/product/product-price';
import ScrollText from '@/components/shared/product/scroll-text';
import { Button } from '@/components/ui/button';
import { BRAND } from '@/lib/brand';
import { localize } from '@/lib/category';
import { SHOP_TIME_ZONE } from '@/lib/constants/currency';
import type { ListingTranslations } from '@/lib/marketplace/catalog';
import { BIZUM_PHONE, LISTING_DAYS, LISTING_PAYMENT_METHODS, LISTING_PRICES, UNPAID_LISTING_HOURS, type ListingPlan } from '@/lib/marketplace/config';
import { fill, publishPageTexts } from '@/lib/marketplace/page-texts';
import { getListingPreview } from '@/lib/marketplace/preview';
import { conditionKey } from '@/lib/constants';
import { formatCurrency } from '@/lib/utils';
import { formatEventDate } from '@/lib/event-date';
import { getT } from '@/lib/i18n-server';
import { serviceTypeKey, wantedBudgetKey } from '@/lib/listing-labels';
import { isLocale } from '@/lib/i18n-core';
import { getShopPlaces } from '@/lib/places';
import CloseListingForm from './close-listing-form';
import PublishForm from './publish-form';
import SellerNameForm from './seller-name-form';
import SellerPhoneForm from './seller-phone-form';
import ShopTeaser from './shop-teaser';

// A private link: no search engine should list or follow it.
export const metadata: Metadata = { title: 'Baifo', robots: { index: false, follow: false } };

interface PublishPageProps {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ pagado?: string }>;
}

const CHIP_CLASS = 'inline-flex w-fit min-w-0 max-w-full items-center gap-1 rounded-full border border-border bg-muted px-3 py-1 text-sm';

/** The person's private page: their listing as it will look, their OK to show their number, the plan and how to pay. */
export default async function PublishPage({ params, searchParams }: PublishPageProps) {
  const [{ token }, { pagado }, { t, locale }] = await Promise.all([params, searchParams, getT()]);
  const texts = publishPageTexts(locale);
  const listing = await getListingPreview(token);

  if (!listing) {
    return <p className='mx-auto max-w-xl py-16 text-center text-muted-foreground'>{texts.unavailable}</p>;
  }

  const isLive = listing.status === 'LIVE';
  const isEnded = listing.status === 'EXPIRED';
  // The person sees the listing in their language; the shop language's text is the fallback.
  const translation = (listing.translations as ListingTranslations)[locale];
  const title = translation?.title || listing.title || '';
  const description = translation?.description || listing.description;
  const condition = conditionKey(listing.condition);
  const serviceKey = listing.type === 'SERVICE' ? serviceTypeKey(listing.serviceType) : undefined;
  const isEvent = listing.type === 'EVENT';
  const place = listing.place ? (await getShopPlaces(locale)).find((item) => item.id === listing.place?.id) : undefined;
  // As on the product page: 0 is a free event or a service without a "from" price.
  const hasPrice = listing.type === 'PRODUCT' || listing.type === 'WANTED' || Number(listing.price) > 0;
  const priceLabel = listing.type === 'WANTED' ? t(wantedBudgetKey(listing.price?.toString(), listing.priceMax?.toString())) : listing.type === 'SERVICE' ? t('PRICE_FROM') : undefined;
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
  // Renewals are paid by Bizum or cash only: the card webhooks know first payments only.
  const renewMethods = LISTING_PAYMENT_METHODS.filter((method) => method === 'bizum' || method === 'cash');
  const canRenew = (isLive || isEnded) && Boolean(listing.paidAt) && listing.hasSellerPhone && renewMethods.length > 0;
  const plan = (listing.plan ?? 'normal') as ListingPlan;
  const renewTexts = {
    ...texts,
    payTitle: texts.renewTitle,
    payIntro: fill(texts.renewIntro, { price: formatCurrency(LISTING_PRICES[plan]), days: LISTING_DAYS }),
    doneText: texts.renewDoneText,
    doneNextCash: texts.renewDoneNextCash,
    laterText: texts.renewLaterText,
  };
  // A claim from before the last payment belongs to that payment.
  const renewClaim = listing.payClaimedAt && listing.paidAt && listing.payClaimedAt > listing.paidAt ? listing.payClaimedMethod : null;
  const renewForm = canRenew && (
    <PublishForm
      token={token}
      texts={renewTexts}
      prices={LISTING_PRICES}
      days={LISTING_DAYS}
      initial={{ isConfirmed: true, claimedMethod: renewClaim === 'cash' ? 'cash' : renewClaim === 'bizum' ? 'bizum' : null }}
      payment={{ ...payment, methods: renewMethods }}
      paypalClientId=''
      shopTeaser={null}
      isRenewal
    />
  );

  const sellerNameForm = listing.hasSellerPhone && (
    <SellerNameForm
      token={token}
      texts={texts}
      name={listing.sellerName ?? ''}
      defaultName={listing.sellerDefault.name}
      locale={isLocale(listing.sellerLocale) ? listing.sellerLocale : (listing.sellerDefault.locale ?? locale)}
    />
  );

  const sellerPhoneForm = listing.hasSellerPhone && <SellerPhoneForm token={token} texts={texts} phoneEnd={listing.sellerPhoneEnd} />;

  return (
    <section className='mx-auto grid max-w-5xl grid-cols-1 gap-6 py-6 lg:grid-cols-2 lg:gap-12'>
      <div className='relative aspect-square'>
        <ProductImages images={listing.images.length > 0 ? listing.images : listing.rawImages} alt={title} />
        {/* Centered: a portrait photo is narrower than its square, so a corner badge would float beside it. */}
        {!isLive && (
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
            <ProductPrice value={Number(listing.price)} maxValue={listing.priceMax?.toString()} label={priceLabel} />
          ) : (
            isEvent && <p className='text-2xl font-semibold'>{t('EVENT_FREE')}</p>
          )}
        </div>

        {isEnded ? (
          <>
            <p className='rounded-3xl border border-border bg-muted p-6'>{fill(texts.endedOn, { date: endDate })}</p>
            {renewForm}
            <ShopTeaser texts={texts} />
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
            {isLive && sellerNameForm}
            {isLive && sellerPhoneForm}
            {isLive && renewForm}
            {isLive && listing.hasSellerPhone && (listing.type === 'PRODUCT' || isEvent) && <CloseListingForm token={token} texts={texts} isEvent={isEvent} />}
            <ShopTeaser texts={texts} ownSlug={listing.product?.slug} />
          </>
        ) : (
          <>
            <p className='text-muted-foreground'>{texts.intro}</p>
            {sellerNameForm}
            {sellerPhoneForm}
            <PublishForm
              token={token}
              texts={texts}
              prices={LISTING_PRICES}
              days={LISTING_DAYS}
              initial={{ isConfirmed: Boolean(listing.consentAt), claimedMethod: listing.payClaimedMethod === 'cash' ? 'cash' : listing.payClaimedMethod === 'bizum' ? 'bizum' : null }}
              payment={payment}
              paypalClientId={process.env.PAYPAL_CLIENT_ID || 'sb'}
              shopTeaser={<ShopTeaser texts={texts} />}
            />
          </>
        )}
      </div>
    </section>
  );
}
