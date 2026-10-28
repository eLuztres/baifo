import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Megaphone } from 'lucide-react';
import OfferCard from '@/components/shared/offers/offer-card';
import PageHeader from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { APP_NAME, OFFERS_ENABLED, OFFERS_PATH } from '@/lib/constants';
import { getT } from '@/lib/i18n-server';
import { getRunningOffers } from '@/lib/offers';
import { pageAlternates } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t('OFFERS_TITLE'), alternates: await pageAlternates(OFFERS_PATH) };
}

/** Every offer running now, also the ones a visitor closed on the home page. */
export default async function OffersPage() {
  if (!OFFERS_ENABLED) notFound();
  const [items, { t }] = await Promise.all([getRunningOffers(), getT()]);

  return (
    <div className='space-y-8 pb-16 sm:space-y-10'>
      <PageHeader title={t('OFFERS_TITLE')} description={t('OFFERS_INTRO', { shop: APP_NAME })} />
      {items.length > 0 ? (
        <div className='grid gap-5 lg:grid-cols-2'>
          {items.map((item) => (
            <OfferCard
              key={item.offer.id}
              {...item}
              linkLabel={t('OFFERS_MORE')}
              className='rounded-3xl border border-border bg-card p-6 text-card-foreground shadow-lg shadow-primary/10 sm:p-8'
            />
          ))}
        </div>
      ) : (
        <div className='flex flex-col items-start gap-4 rounded-3xl border border-dashed border-border bg-card/60 p-6 sm:p-8'>
          <Megaphone className='size-8 text-muted-foreground' aria-hidden='true' />
          <p className='text-muted-foreground'>{t('OFFERS_EMPTY')}</p>
          <Button asChild variant='outline' className='rounded-full'>
            <Link href='/'>{t('OFFERS_BACK_HOME')}</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
