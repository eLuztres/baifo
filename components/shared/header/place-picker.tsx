'use client';

import { useEffect, useTransition } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Loader2, MapPin } from 'lucide-react';
import { useI18n } from '@/components/i18n-provider';
import ProductMedia from '@/components/ProductMedia';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { chosenPlaces, firstName, PLACES_COOKIE, PLACES_COOKIE_MAX_AGE, PLACES_STORAGE_KEY, type ShopPlace } from '@/lib/places-core';
import { cn } from '@/lib/utils';

interface PlacePickerProps {
  places: ShopPlace[];
  /** What the cookie held for this render, so the browser's saved choice can be compared with it. */
  savedSlugs: string[];
  className?: string;
}

const CORRAL_ICON = '/brand/icons/corral-128.png';

const writeCookie = (value: string) => {
  document.cookie = `${PLACES_COOKIE}=${value}; path=/; max-age=${PLACES_COOKIE_MAX_AGE}; samesite=lax`;
};

/** Remembers the visitor's places on this device; the cookie lets the server show only them from the first render. */
export function savePlaces(slugs: string[]) {
  const value = slugs.join(',');
  try {
    localStorage.setItem(PLACES_STORAGE_KEY, value);
  } catch {
    // Private mode without storage: the cookie alone still works.
  }
  writeCookie(value);
}

/** The corral in the header: opens the people of each place; tapping one opens their corral page. */
export default function PlacePicker({ places, savedSlugs, className }: PlacePickerProps) {
  const { t } = useI18n();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const live = places.filter((place) => place.isLive);
  const soon = places.filter((place) => !place.isLive);

  // The places aren't a choice anymore: a visitor who narrowed them down before sees the whole island again.
  useEffect(() => {
    const liveSlugs = live.map((place) => place.slug);
    if (chosenPlaces(places, savedSlugs).length >= liveSlugs.length) return;
    savePlaces(liveSlugs);
    startTransition(() => router.refresh());
    // Only once per page load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button variant='ghost' className={cn('group h-14 gap-1.5 rounded-full px-1 text-sm sm:pr-3', className)} aria-label={t('PLACES_TITLE')}>
          {/* A little corral with its baifos: the people of each place are behind it. The picture has a wide empty
              border, so it's scaled up to fill its spot, with a soft glow so its dark rim shows on the dark header. */}
          {isPending ? (
            <Loader2 className='size-14 animate-spin p-3 text-primary' />
          ) : (
            <Image
              src={CORRAL_ICON}
              alt=''
              width={56}
              height={56}
              className='size-14 scale-[1.35] drop-shadow-[0_0_6px_color-mix(in_srgb,var(--foreground)_35%,transparent)] transition-transform group-hover:-rotate-6 group-hover:scale-[1.45]'
            />
          )}
          {/* At 320px the word would push the menu button off the screen; the corral says enough there. */}
          <span className='whitespace-nowrap max-[359px]:hidden'>{t('PLACES_BUTTON')}</span>
        </Button>
      </DrawerTrigger>
      <DrawerContent className='mx-auto max-w-md'>
        <DrawerHeader className='items-center text-center'>
          <DrawerTitle className='font-display text-2xl'>{t('PLACES_TITLE')}</DrawerTitle>
          <DrawerDescription>
            {live.length === 1 ? t('PLACES_START_NOTE', { place: live[0].name }) : t('PLACES_INTRO')}
          </DrawerDescription>
        </DrawerHeader>
        <div className='max-h-[70svh] overflow-y-auto px-4 pb-8'>
          {/* People first: each live place is the person who welcomes you there, and a tap opens their corral. */}
          <ul className='space-y-3'>
            {live.map((place) => {
              const card = (
                <>
                  <HostPhoto place={place} />
                  <div className='min-w-0 flex-1'>
                    <p className='truncate font-display text-xl leading-tight'>{place.hostName ? firstName(place.hostName) : place.name}</p>
                    {place.hostName && <p className='truncate text-sm text-muted-foreground'>{place.name}</p>}
                    {place.corralName && (
                      <p className='mt-1 text-sm font-medium text-primary'>
                        {place.hostName ? t('CORRAL_MEET', { name: firstName(place.hostName) }) : t('CORRAL_VISIT', { name: place.corralName })}
                      </p>
                    )}
                  </div>
                  {place.corralName && <ArrowRight className='size-5 shrink-0 text-primary transition-transform group-hover:translate-x-1' aria-hidden />}
                </>
              );
              const cardClass = 'group flex items-center gap-4 rounded-3xl border border-border bg-card p-3 transition';
              return (
                <li key={place.slug}>
                  {place.corralName ? (
                    <DrawerClose asChild>
                      <Link href={`/corral/${place.slug}`} className={cn(cardClass, 'hover:border-primary/40 hover:bg-primary/10')}>
                        {card}
                      </Link>
                    </DrawerClose>
                  ) : (
                    <div className={cardClass}>{card}</div>
                  )}
                </li>
              );
            })}
          </ul>
          {soon.length > 0 && (
            <p className='mt-4 text-balance text-center text-sm text-muted-foreground'>
              <span className='font-medium text-foreground'>{t('PLACES_SOON_LIST')}</span> {soon.map((place) => place.name).join(' · ')}
            </p>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

/** The host's face in a circle; a pin while a place has no one yet. */
function HostPhoto({ place }: { place: ShopPlace }) {
  return (
    <span className='relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-primary'>
      {place.hostImage ? (
        <ProductMedia src={place.hostImage} alt={place.hostName ?? place.name} fill sizes='64px' className='object-cover object-top' />
      ) : (
        <MapPin className='size-6' aria-hidden />
      )}
    </span>
  );
}
