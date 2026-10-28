import Link from 'next/link';
import { ArrowRight, MessageCircle } from 'lucide-react';
import FeedCard from '@/components/shared/product/feed-card';
import { getInStockRings, inPlaces } from '@/components/shared/home/in-stock-rings';
import { Button } from '@/components/ui/button';
import { BRAND } from '@/lib/brand';
import { localizeProduct } from '@/lib/category';
import { getT } from '@/lib/i18n-server';
import { feedCardLabels } from '@/lib/listing-labels';
import type { PublishPageTexts } from '@/lib/marketplace/page-texts';
import { getVisitorPlaceIds } from '@/lib/places';
import { timeAgo } from '@/lib/utils';

// A taste of the shop, not a second feed: four tiles fill two rows on a phone.
const TEASER_COUNT = 4;

interface ShopTeaserProps {
  texts: PublishPageTexts;
  /** The person's own listing, once it is in the shop: not shown to them again. */
  ownSlug?: string;
}

/** The end of the private page: the newest listings around the person and a way into the shop, so it isn't a dead end. */
export default async function ShopTeaser({ texts, ownSlug }: ShopTeaserProps) {
  const [{ t, locale }, rings, placeIds] = await Promise.all([getT(), getInStockRings(), getVisitorPlaceIds()]);
  const listings = inPlaces(rings, placeIds)
    .filter((ring) => ring.slug !== ownSlug)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, TEASER_COUNT);
  const now = new Date();
  const publishUrl = BRAND.contact.whatsappUrl;

  return (
    <section aria-labelledby='shop-teaser' className='space-y-4 border-t border-border pt-6'>
      <div className='space-y-1'>
        <h2 id='shop-teaser' className='font-display text-2xl'>
          {texts.teaserTitle}
        </h2>
        <p className='text-sm text-muted-foreground'>{texts.teaserText}</p>
      </div>
      {listings.length > 0 && (
        <ul className='grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2'>
          {listings.map((listing) => (
            <li key={listing.id} className='aspect-[3/4]'>
              <FeedCard
                href={`/product/${listing.slug}`}
                name={localizeProduct(listing, locale).name}
                images={listing.images}
                price={listing.price}
                priceMax={listing.priceMax}
                {...feedCardLabels(listing, t, locale, now)}
                isReserved={listing.isReserved}
                reservedLabel={t('RESERVE_BADGE')}
                listedAgo={timeAgo(listing.createdAt, locale, now)}
              />
            </li>
          ))}
        </ul>
      )}
      {/* Side by side while both labels fit, else stacked. */}
      <div className='flex flex-wrap gap-2'>
        <Button asChild className='h-12 flex-1 rounded-full'>
          <Link href='/explore'>
            {texts.teaserAll} <ArrowRight />
          </Link>
        </Button>
        {publishUrl && (
          <Button asChild variant='outline' className='h-12 flex-1 rounded-full'>
            <a href={publishUrl} target='_blank' rel='noopener noreferrer'>
              <MessageCircle /> {texts.publishAnother}
            </a>
          </Button>
        )}
      </div>
    </section>
  );
}
