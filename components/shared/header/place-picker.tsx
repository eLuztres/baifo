'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Loader2, MapPin } from 'lucide-react';
import { useI18n } from '@/components/i18n-provider';
import IslandMap from '@/components/shared/island-map';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { Label } from '@/components/ui/label';
import { chosenPlaces, PLACES_COOKIE, PLACES_COOKIE_MAX_AGE, PLACES_STORAGE_KEY, type ShopPlace } from '@/lib/places-core';
import { cn } from '@/lib/utils';

interface PlacePickerProps {
  places: ShopPlace[];
  /** What the cookie held for this render, so the browser's saved choice can be compared with it. */
  savedSlugs: string[];
  className?: string;
}

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

/** "📍 Corralejo" in the header: opens the island, where the visitor switches the places they want to see on and off. */
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

  const label =
    chosen.length === 1
      ? live.find((place) => place.slug === chosen[0])?.name
      : chosen.length === live.length
        ? t('PLACES_ALL_ISLAND')
        : t('PLACES_COUNT', { count: chosen.length });

  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button variant='ghost' className={cn('h-9 gap-1.5 rounded-full px-3 text-sm', className)} aria-label={`${t('PLACES_TITLE')}: ${label}`}>
          {isPending ? <Loader2 className='size-4 animate-spin text-primary' /> : <MapPin className='size-4 text-primary' />}
          <span className='max-w-28 truncate'>{label}</span>
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
          <IslandMap places={places} chosen={chosen} onToggle={toggle} className='max-h-[34svh]' />
          {/* Only a real choice gets checkboxes: with one live place there's nothing to switch. */}
          {live.length > 1 && (
            <ul className='mt-4 flex flex-wrap justify-center gap-2'>
              {live.map((place) => (
                <li key={place.slug}>
                  <Label className='flex items-center gap-2 rounded-full border border-border px-3 py-2 font-normal'>
                    <Checkbox checked={chosen.includes(place.slug)} onCheckedChange={() => toggle(place.slug)} />
                    {place.name}
                  </Label>
                </li>
              ))}
            </ul>
          )}
          {soon.length > 0 && (
            <p className='mt-3 text-balance text-center text-sm text-muted-foreground'>
              <span className='font-medium text-foreground'>{t('PLACES_SOON_LIST')}</span> {soon.map((place) => place.name).join(' · ')}
            </p>
          )}
          {/* Each open Corral: the real spot behind the place, one tap away. */}
          {live.some((place) => place.corralName) && (
            <ul className='mt-4 space-y-2'>
              {live
                .filter((place) => place.corralName)
                .map((place) => (
                  <li key={place.slug}>
                    <DrawerClose asChild>
                      <Link
                        href={`/corral/${place.slug}`}
                        className='flex items-center justify-between gap-3 rounded-2xl bg-primary/10 px-4 py-3 text-sm font-medium text-primary transition hover:bg-primary/15'
                      >
                        {t('CORRAL_VISIT', { name: place.corralName ?? '' })}
                        <ArrowRight className='size-4' aria-hidden />
                      </Link>
                    </DrawerClose>
                  </li>
                ))}
            </ul>
          )}
          {live.length > 1 && chosen.length < live.length && (
            <Button variant='outline' className='mt-4 w-full rounded-full' onClick={() => choose(live.map((place) => place.slug))}>
              {t('PLACES_ALL_ISLAND')}
            </Button>
          )}
          <p className='mt-4 text-center text-[0.65rem] text-muted-foreground'>{t('PLACES_MAP_CREDIT')}</p>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
