'use client';

import { useEffect, useState, useTransition } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Loader2, MapPin } from 'lucide-react';
import { useI18n } from '@/components/i18n-provider';
import ProductMedia from '@/components/ProductMedia';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { Label } from '@/components/ui/label';
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

/** "📍 Corralejo" in the header: opens the people of each place, where the visitor switches the places they want to see on and off. */
export default function PlacePicker({ places, savedSlugs, className }: PlacePickerProps) {
  const { t } = useI18n();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [chosen, setChosen] = useState(() => chosenPlaces(places, savedSlugs).map((place) => place.slug));
  const live = places.filter((place) => place.isLive);
  const soon = places.filter((place) => !place.isLive);

  // The browser's saved choice wins over a cookie that was cleared or never set; the other way round fills the storage.
  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(PLACES_STORAGE_KEY);
    } catch {
      return;
    }
    const inCookie = savedSlugs.join(',');
    if (stored === null) {
      if (inCookie) savePlaces(savedSlugs);
    } else if (stored !== inCookie) {
      writeCookie(stored);
      setChosen(chosenPlaces(places, stored.split(',')).map((place) => place.slug));
      startTransition(() => router.refresh());
    }
    // Only once per page load: later changes go through choose().
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const choose = (slugs: string[]) => {
    // At least one place stays on: an empty shop helps no one.
    if (slugs.length === 0) return;
    setChosen(slugs);
    savePlaces(slugs);
    startTransition(() => router.refresh());
  };
  const toggle = (slug: string) => choose(chosen.includes(slug) ? chosen.filter((item) => item !== slug) : [...chosen, slug]);

  // Island order, not tap order. "Whole island" only once no place is still to come.
  const chosenNames = live.filter((place) => chosen.includes(place.slug)).map((place) => place.name);
  const isWholeIsland = places.length > 1 && chosenNames.length === places.length;
  const fullLabel = isWholeIsland ? t('PLACES_ALL_ISLAND') : chosenNames.join(' · ');

  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button variant='ghost' className={cn('group h-11 gap-1.5 rounded-full px-1 text-sm sm:pr-3', className)} aria-label={`${t('PLACES_TITLE')}: ${fullLabel}`}>
          {/* A little corral with its baifos: the people of each place are behind it. */}
          {isPending ? (
            <Loader2 className='size-11 animate-spin p-2.5 text-primary' />
          ) : (
            <Image src={CORRAL_ICON} alt='' width={44} height={44} className='size-11 transition-transform group-hover:-rotate-6 group-hover:scale-110' />
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
          {/* People first: each live place is the person who welcomes you there. */}
          <ul className='space-y-3'>
            {live.map((place) => {
              const isChosen = chosen.includes(place.slug);
              // Only a real choice can be switched: with one live place there's nothing to tap on or off.
              const Card = live.length > 1 ? Label : 'div';
              return (
                <li key={place.slug}>
                  <Card
                    className={cn(
                      'flex items-center gap-4 rounded-3xl border p-3 font-normal transition',
                      isChosen ? 'border-primary/40 bg-primary/10' : 'border-border bg-card opacity-60'
                    )}
                  >
                    <HostPhoto place={place} />
                    <div className='min-w-0 flex-1'>
                      <p className='truncate font-display text-xl leading-tight'>{place.hostName ? firstName(place.hostName) : place.name}</p>
                      {place.hostName && <p className='truncate text-sm text-muted-foreground'>{place.name}</p>}
                      {place.corralName && (
                        <DrawerClose asChild>
                          <Link
                            href={`/corral/${place.slug}`}
                            className='mt-1 inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline'
                          >
                            {place.hostName ? t('CORRAL_MEET', { name: firstName(place.hostName) }) : t('CORRAL_VISIT', { name: place.corralName })}
                            <ArrowRight className='size-4' aria-hidden />
                          </Link>
                        </DrawerClose>
                      )}
                    </div>
                    {live.length > 1 && <Checkbox checked={isChosen} onCheckedChange={() => toggle(place.slug)} aria-label={place.name} className='size-6' />}
                  </Card>
                </li>
              );
            })}
          </ul>
          {soon.length > 0 && (
            <p className='mt-4 text-balance text-center text-sm text-muted-foreground'>
              <span className='font-medium text-foreground'>{t('PLACES_SOON_LIST')}</span> {soon.map((place) => place.name).join(' · ')}
            </p>
          )}
          {live.length > 1 && chosen.length < live.length && (
            <Button variant='outline' className='mt-4 w-full rounded-full' onClick={() => choose(live.map((place) => place.slug))}>
              {t('PLACES_CHOOSE_ALL')}
            </Button>
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
