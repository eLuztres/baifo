import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Clock, Handshake, LifeBuoy, Mail, MapPin, MessageCircle, Navigation, Phone, Users } from 'lucide-react';
import ProductMedia from '@/components/ProductMedia';
import FeedCard from '@/components/shared/product/feed-card';
import { getInStockRings } from '@/components/shared/home/in-stock-rings';
import { Button } from '@/components/ui/button';
import { BRAND } from '@/lib/brand';
import { localizeProduct } from '@/lib/category';
import { APP_NAME } from '@/lib/constants';
import { getT } from '@/lib/i18n-server';
import { getPlaceWithCorral, type PlaceWithCorral } from '@/lib/places';
import { metaDescription, pageAlternates } from '@/lib/seo';
import { timeAgo } from '@/lib/utils';

interface CorralPageProps {
  params: Promise<{ slug: string }>;
}

// The newest few: a taste of what's there, the feed has the rest.
const LISTING_COUNT = 8;
// Around the pin: about two streets each way.
const MAP_SPAN = { lat: 0.0025, lng: 0.004 };

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
  const rings = await getInStockRings();
  const listings = rings
    .filter((ring) => ring.placeId === place.id)
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
    { icon: Handshake, title: t('CORRAL_DO_HANDOVER_TITLE'), text: t('CORRAL_DO_HANDOVER_TEXT') },
    { icon: LifeBuoy, title: t('CORRAL_DO_HELP_TITLE'), text: t('CORRAL_DO_HELP_TEXT') },
    { icon: Users, title: t('CORRAL_DO_MEET_TITLE'), text: t('CORRAL_DO_MEET_TEXT') },
  ];
  const portrait = corral.image ?? corral.hostImage;

  return (
    <div className='mx-auto w-full max-w-6xl space-y-16 px-4 py-8 sm:space-y-24 sm:py-14'>
      {/* The welcome: what it is and how to get there in the first screen, then who's there. */}
      <section className='grid items-center gap-8 lg:grid-cols-[1.1fr_1fr] lg:gap-14'>
        <div className='space-y-6'>
          <p className='inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-sm font-medium text-primary'>
            <MapPin className='size-4' aria-hidden /> {t('CORRAL_EYEBROW', { shop: APP_NAME, place: place.name })}
          </p>
          <h1 className='text-balance font-display text-5xl leading-[1.05] sm:text-6xl'>{corral.name}</h1>
          {corral.text && <p className='max-w-xl text-pretty text-lg text-muted-foreground'>{corral.text}</p>}
          <p className='flex items-start gap-2 text-base'>
            <MapPin className='mt-1 size-4 shrink-0 text-primary' aria-hidden />
            <span>
              {corral.venue && <span className='font-medium'>{corral.venue} · </span>}
              {corral.address}
            </span>
          </p>
          <div className='flex flex-wrap gap-3'>
            <Button asChild size='lg' className='rounded-full'>
              <a href={directionsUrl(corral)} target='_blank' rel='noopener noreferrer'>
                <Navigation /> {t('CORRAL_DIRECTIONS')}
              </a>
            </Button>
            {corral.whatsapp && (
              <Button asChild size='lg' variant='outline' className='rounded-full'>
                <a href={`https://wa.me/${digits(corral.whatsapp)}`} target='_blank' rel='noopener noreferrer'>
                  <MessageCircle /> {t('CORRAL_WHATSAPP')}
                </a>
              </Button>
            )}
          </div>
        </div>

        {portrait && (
          <figure className='relative mx-auto w-full max-w-72 sm:max-w-md'>
            {/* An arch, like the doorways of the island's old houses. */}
            <div className='relative aspect-[4/5] overflow-hidden rounded-t-full rounded-b-3xl border border-primary/25 shadow-2xl shadow-primary/15'>
              <ProductMedia src={portrait} alt={corral.hostName ?? corral.name} fill sizes='(min-width: 1024px) 28rem, 90vw' className='object-cover object-top' priority />
            </div>
            {corral.hostName && (
              <figcaption className='absolute -bottom-5 left-1/2 w-max max-w-[90%] -translate-x-1/2 rounded-2xl border border-border bg-card px-5 py-3 text-center shadow-lg'>
                <span className='block text-xs uppercase tracking-widest text-muted-foreground'>{t('CORRAL_HOST')}</span>
                <span className='block font-display text-xl'>{corral.hostName}</span>
                {corral.venue && <span className='block text-sm text-muted-foreground'>{t('CORRAL_HOST_AT', { venue: corral.venue })}</span>}
              </figcaption>
            )}
          </figure>
        )}
      </section>

      <section aria-labelledby='corral-do' className='space-y-6'>
        <h2 id='corral-do' className='text-center font-display text-3xl sm:text-4xl'>
          {t('CORRAL_DO_TITLE')}
        </h2>
        <ul className='grid gap-4 sm:grid-cols-3'>
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
              <li key={listing.id} className='aspect-[4/5]'>
                <FeedCard
                  href={`/product/${listing.slug}`}
                  name={localizeProduct(listing, locale).name}
                  images={listing.images}
                  price={listing.price}
                  priceMax={listing.priceMax}
                  priceLabel={listing.isWanted ? t('WANTED_BUDGET') : undefined}
                  badge={listing.isService ? t('EXPLORE_SERVICE_BADGE') : listing.isWanted ? t('EXPLORE_WANTED_BADGE') : undefined}
                  isReserved={listing.isReserved}
                  reservedLabel={t('RESERVE_BADGE')}
                  listedAgo={timeAgo(listing.createdAt, locale, now)}
                />
              </li>
            ))}
          </ul>
        </section>
      )}
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
