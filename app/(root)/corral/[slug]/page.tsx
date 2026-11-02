import { existsSync } from 'node:fs';
import path from 'node:path';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Clock, LifeBuoy, Mail, MapPin, MessageCircle, Navigation, Phone, Users } from 'lucide-react';
import ProductMedia from '@/components/ProductMedia';
import FeedCard from '@/components/shared/product/feed-card';
import { getInStockRings } from '@/components/shared/home/in-stock-rings';
import { Button } from '@/components/ui/button';
import { BRAND } from '@/lib/brand';
import { localizeProduct } from '@/lib/category';
import { APP_NAME } from '@/lib/constants';
import { getT } from '@/lib/i18n-server';
import { feedCardLabels } from '@/lib/listing-labels';
import { getPlaceWithCorral, type PlaceWithCorral } from '@/lib/places';
import { firstName } from '@/lib/places-core';
import { metaDescription, pageAlternates } from '@/lib/seo';
import { cn, timeAgo } from '@/lib/utils';

interface CorralPageProps {
  params: Promise<{ slug: string }>;
}

// The newest few: a taste of what's there, the feed has the rest.
const LISTING_COUNT = 8;
// Around the pin: about two streets each way.
const MAP_SPAN = { lat: 0.0025, lng: 0.004 };

// A town's typical scene behind its host, when the shop has one in public/brand/corral/.
const backgroundOf = (slug: string) => {
  const file = `/brand/corral/${slug}-background.jpg`;
  return existsSync(path.join(process.cwd(), 'public', file)) ? file : undefined;
};
const digits = (phone: string) => phone.replace(/\D/g, '');
const directionsUrl = ({ venue, address }: { venue: string | null; address: string }) =>
  `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent([venue, address].filter(Boolean).join(', '))}`;
const mapUrl = (lat: number, lng: number) =>
  `https://www.openstreetmap.org/export/embed.html?bbox=${lng - MAP_SPAN.lng},${lat - MAP_SPAN.lat},${lng + MAP_SPAN.lng},${lat + MAP_SPAN.lat}&layer=mapnik&marker=${lat},${lng}`;

export async function generateMetadata({ params }: CorralPageProps): Promise<Metadata> {
  const [{ slug }, { t, locale }] = await Promise.all([params, getT()]);
  const place = await getPlaceWithCorral(slug, locale);
  if (!place) return {};
  const { corral } = place;
  return {
    title: corral ? corral.name : t('CORRAL_SOON_TITLE', { place: place.name }),
    description: corral ? metaDescription(t('CORRAL_SEO_DESCRIPTION', { name: corral.name, address: corral.address, shop: APP_NAME })) : undefined,
    alternates: await pageAlternates(`/corral/${slug}`),
  };
}

/** A place's Corral: the real spot where people hand things over, get help and meet. A place without one says it's coming. */
export default async function CorralPage({ params }: CorralPageProps) {
  const [{ slug }, { t, locale }] = await Promise.all([params, getT()]);
  const place = await getPlaceWithCorral(slug, locale);
  if (!place) notFound();
  if (!place.corral || !place.isLive) return <SoonCorral place={place} />;

  const { corral } = place;
  const listings = (await getInStockRings({ placeId: place.id }))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, LISTING_COUNT);
  const now = new Date();
  const contacts = [
    corral.whatsapp && { href: `https://wa.me/${digits(corral.whatsapp)}`, icon: MessageCircle, label: t('CORRAL_WHATSAPP'), value: corral.whatsapp, isExternal: true },
    corral.phone && { href: `tel:+${digits(corral.phone)}`, icon: Phone, label: t('CORRAL_CALL'), value: corral.phone },
    // A long address breaks after the @ on a phone, not in the middle of a word.
    corral.email && { href: `mailto:${corral.email}`, icon: Mail, label: 'Email', value: corral.email.replace('@', '@\u200B') },
  ].filter((contact) => !!contact);
  const activities = [
    { icon: LifeBuoy, title: t('CORRAL_DO_HELP_TITLE'), text: t('CORRAL_DO_HELP_TEXT') },
    { icon: Users, title: t('CORRAL_DO_MEET_TITLE'), text: t('CORRAL_DO_MEET_TEXT') },
  ];
  const portrait = corral.image ?? corral.hostImage;
  const background = backgroundOf(place.slug);

  return (
    <div className='mx-auto w-full max-w-6xl space-y-16 px-4 py-8 sm:space-y-24 sm:py-14'>
      {/* The person first: who welcomes you, then how to reach them. */}
      <section
        className={cn(
          'relative grid items-center gap-8 lg:gap-14',
          portrait && 'lg:grid-cols-[1fr_1.2fr]',
          background && 'isolate overflow-hidden rounded-[2rem] border border-border px-4 py-10 sm:px-10 sm:py-14'
        )}
      >
        {background && (
          <>
            <ProductMedia src={background} fill sizes='(min-width: 1280px) 72rem, 100vw' className='-z-20 object-cover' priority />
            {/* Softened so the person and the words stay in front, in light and dark themes. */}
            <span className='absolute inset-0 -z-10 bg-gradient-to-b from-background/40 via-background/75 to-background/95 lg:bg-gradient-to-r lg:from-background/20 lg:via-background/70 lg:to-background/90' aria-hidden />
          </>
        )}
        {portrait && (
          <figure className='relative mx-auto w-full max-w-48 sm:max-w-sm'>
            {/* An arch, like the doorways of the island's old houses. */}
            <div className='relative aspect-[3/4] overflow-hidden rounded-t-full rounded-b-3xl border border-primary/25 shadow-2xl shadow-primary/15'>
              <ProductMedia src={portrait} alt={corral.hostName ?? corral.name} fill sizes='(min-width: 640px) 24rem, 12rem' className='object-cover object-top' priority />
            </div>
          </figure>
        )}
        <div className={cn('space-y-4 text-center sm:space-y-5', portrait && 'lg:text-left')}>
          <h1 className='text-balance font-display text-4xl leading-[1.05] sm:text-6xl'>
            {corral.hostName ? t('CORRAL_HELLO', { name: firstName(corral.hostName) }) : corral.name}
          </h1>
          {corral.text && <p className={cn('mx-auto max-w-xl text-pretty text-lg text-muted-foreground', portrait && 'lg:mx-0')}>{corral.text}</p>}
          <p className='text-pretty text-base'>
            <MapPin className='mr-1.5 inline size-4 -translate-y-px text-primary' aria-hidden />
            <span>
              <span className='font-medium'>{corral.name}</span>
              {' · '}
              {[corral.venue, corral.address].filter(Boolean).join(', ')}
            </span>
          </p>
          <div className={cn('flex flex-wrap justify-center gap-3', portrait && 'lg:justify-start')}>
            {corral.whatsapp && (
              <Button asChild size='lg' className='rounded-full'>
                <a href={`https://wa.me/${digits(corral.whatsapp)}`} target='_blank' rel='noopener noreferrer'>
                  <MessageCircle /> {t('CORRAL_WHATSAPP')}
                </a>
              </Button>
            )}
            <Button asChild size='lg' variant={corral.whatsapp ? 'outline' : 'default'} className='rounded-full'>
              <a href={directionsUrl(corral)} target='_blank' rel='noopener noreferrer'>
                <Navigation /> {t('CORRAL_DIRECTIONS')}
              </a>
            </Button>
          </div>
        </div>
      </section>

      <section aria-labelledby='corral-where' className='grid gap-6 lg:grid-cols-[1.4fr_1fr]'>
        {corral.lat !== null && corral.lng !== null && (
          // A still map: scrolling the page over it must not zoom it; a tap opens the directions instead.
          <a
            href={directionsUrl(corral)}
            target='_blank'
            rel='noopener noreferrer'
            aria-label={`${t('CORRAL_MAP', { name: corral.name })} · ${t('CORRAL_DIRECTIONS')}`}
            className='group relative block min-h-80 overflow-hidden rounded-3xl border border-border bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
          >
            <iframe
              title={t('CORRAL_MAP', { name: corral.name })}
              src={mapUrl(corral.lat, corral.lng)}
              loading='lazy'
              tabIndex={-1}
              className='pointer-events-none absolute inset-0 size-full'
            />
            <span className='absolute bottom-4 left-4 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-lg transition group-hover:scale-105'>
              <Navigation className='size-4' aria-hidden /> {t('CORRAL_DIRECTIONS')}
            </span>
          </a>
        )}
        <div className='space-y-6 rounded-3xl border border-border bg-card p-6 sm:p-8'>
          <h2 id='corral-where' className='font-display text-3xl'>
            {t('CORRAL_FIND_US')}
          </h2>
          <div className='space-y-1'>
            {corral.venue && <p className='font-medium'>{corral.venue}</p>}
            <p className='text-muted-foreground'>{corral.address}</p>
            <a href={directionsUrl(corral)} target='_blank' rel='noopener noreferrer' className='inline-flex items-center gap-1 pt-1 text-sm font-medium text-primary underline-offset-4 hover:underline'>
              <Navigation className='size-4' aria-hidden /> {t('CORRAL_DIRECTIONS')}
            </a>
          </div>
          <div className='space-y-1'>
            <h3 className='flex items-center gap-2 text-sm font-medium'>
              <Clock className='size-4 text-primary' aria-hidden /> {t('CORRAL_HOURS')}
            </h3>
            <p className='whitespace-pre-line text-muted-foreground'>{corral.hours || t('CORRAL_HOURS_ASK')}</p>
          </div>
          {contacts.length > 0 && (
            <div className='space-y-2'>
              <h3 className='text-sm font-medium'>{t('CORRAL_CONTACT')}</h3>
              <ul className='space-y-2'>
                {contacts.map(({ href, icon: Icon, label, value, isExternal }) => (
                  <li key={href}>
                    <a
                      href={href}
                      {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                      className='flex items-center gap-3 rounded-2xl px-1 py-1 transition hover:text-primary'
                    >
                      <span className='flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary'>
                        <Icon className='size-4' aria-hidden />
                      </span>
                      <span>
                        <span className='block text-xs text-muted-foreground'>{label}</span>
                        <span className='block break-words'>{value}</span>
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>

      {listings.length > 0 && (
        <section aria-labelledby='corral-listings' className='space-y-6'>
          <div className='flex flex-wrap items-end justify-between gap-3'>
            <h2 id='corral-listings' className='font-display text-3xl sm:text-4xl'>
              {t('CORRAL_LISTINGS', { place: place.name })}
            </h2>
            <Link href='/explore' className='text-sm font-medium text-primary underline-offset-4 hover:underline'>
              {t('CORRAL_SEE_ALL')}
            </Link>
          </div>
          <ul className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
            {listings.map((listing) => (
              <li key={listing.id}>
                <FeedCard
                  href={`/product/${listing.slug}`}
                  name={localizeProduct(listing, locale).shortName}
                  images={listing.images}
                  price={listing.price}
                  {...feedCardLabels(listing, t, locale, now)}
                  isReserved={listing.isReserved}
                  reservedLabel={t('RESERVE_BADGE')}
                  listedAgo={timeAgo(listing.createdAt, locale, now)}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby='corral-do' className='space-y-6'>
        <h2 id='corral-do' className='text-center font-display text-3xl sm:text-4xl'>
          {t('CORRAL_DO_TITLE')}
        </h2>
        <ul className='mx-auto grid max-w-3xl gap-4 sm:grid-cols-2'>
          {activities.map(({ icon: Icon, title, text }) => (
            <li key={title} className='space-y-3 rounded-3xl border border-border bg-card p-6'>
              <span className='flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary'>
                <Icon className='size-6' aria-hidden />
              </span>
              <h3 className='font-display text-xl'>{title}</h3>
              <p className='text-pretty text-muted-foreground'>{text}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

/** A town without its Corral yet: says it's coming and asks who'd like to help open it. */
async function SoonCorral({ place }: { place: PlaceWithCorral }) {
  const { t } = await getT();
  const whatsappUrl = BRAND.contact.showPhone ? BRAND.contact.whatsappUrl : undefined;
  return (
    <div className='mx-auto flex w-full max-w-xl flex-col items-center gap-5 px-4 py-20 text-center sm:py-28'>
      <span className='flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary'>
        <MapPin className='size-8' aria-hidden />
      </span>
      <h1 className='text-balance font-display text-4xl sm:text-5xl'>{t('CORRAL_SOON_TITLE', { place: place.name })}</h1>
      <p className='text-pretty text-lg text-muted-foreground'>{t('CORRAL_SOON_TEXT', { place: place.name })}</p>
      {whatsappUrl && (
        <Button asChild size='lg' className='rounded-full'>
          <a href={whatsappUrl} target='_blank' rel='noopener noreferrer'>
            <MessageCircle /> {t('CORRAL_SOON_CTA')}
          </a>
        </Button>
      )}
    </div>
  );
}
