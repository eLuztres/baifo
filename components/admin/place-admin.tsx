'use client';

import { useEffect, useState, useTransition, type MouseEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, MapPin, Plus, Store } from 'lucide-react';
import { useI18n } from '@/components/i18n-provider';
import CorralForm, { type CorralDraft } from '@/components/admin/corral-form';
import { ISLAND_MASK, ISLAND_RATIO } from '@/components/shared/island-map';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { savePlace } from '@/lib/actions/place.actions';
import { translateMessage } from '@/lib/i18n-core';
import type { ShopPlace } from '@/lib/places-core';
import { cn } from '@/lib/utils';

interface PlaceAdminProps {
  places: ShopPlace[];
  /** Each place's Corral by place id, its texts in the shop's language. */
  corrals: Record<string, CorralDraft>;
}

// A new place starts in the middle of the island, ready to be moved to its town.
const NEW_PLACE: ShopPlace = { id: '', slug: '', name: '', x: 50, y: 50, isLive: false };

/** Every place as a card (name, live), and the island: a click on it moves the chosen place's pin there. */
export default function PlaceAdmin({ places, corrals }: PlaceAdminProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [drafts, setDrafts] = useState(places);
  const [selected, setSelected] = useState(0);
  // After a save the page brings the stored places, ids of new ones included.
  useEffect(() => setDrafts(places), [places]);

  const change = (index: number, patch: Partial<ShopPlace>) =>
    setDrafts((current) => current.map((place, at) => (at === index ? { ...place, ...patch } : place)));

  // Where on the picture the admin clicked, in %, which is how pins are stored.
  const movePin = (event: MouseEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const x = Math.round(((event.clientX - box.left) / box.width) * 1000) / 10;
    const y = Math.round(((event.clientY - box.top) / box.height) * 1000) / 10;
    change(selected, { x, y });
  };

  const save = (place: ShopPlace) =>
    startTransition(async () => {
      const result = await savePlace({ id: place.id || undefined, name: place.name, isLive: place.isLive, x: place.x, y: place.y });
      toast({ variant: result.success ? 'default' : 'destructive', description: translateMessage(t, result.message) });
      if (result.success) router.refresh();
    });

  const add = () => {
    setDrafts((current) => [...current, NEW_PLACE]);
    setSelected(drafts.length);
  };

  return (
    <div className='grid gap-8 lg:grid-cols-[minmax(0,22rem)_1fr]'>
      <div className='space-y-2'>
        <p className='text-sm text-muted-foreground'>{t('PLACES_ADMIN_PIN_HINT', { place: drafts[selected]?.name || '…' })}</p>
        <div
          onClick={movePin}
          className='relative mx-auto w-full max-w-sm cursor-crosshair'
          style={{ aspectRatio: ISLAND_RATIO }}
        >
          <div className='absolute inset-0 bg-primary/15' style={{ mask: ISLAND_MASK, WebkitMask: ISLAND_MASK }} aria-hidden />
          {drafts.map((place, index) => (
            <span
              key={place.id || `new-${index}`}
              style={{ left: `${place.x}%`, top: `${place.y}%` }}
              className={cn(
                'pointer-events-none absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 shadow',
                index === selected ? 'scale-150 border-background bg-primary' : place.isLive ? 'border-primary bg-background' : 'border-background bg-muted-foreground/40'
              )}
              aria-hidden
            />
          ))}
        </div>
      </div>

      <ul className='space-y-3'>
        {drafts.map((place, index) => (
          <li
            key={place.id || `new-${index}`}
            className={cn('flex flex-wrap items-end gap-3 rounded-2xl border bg-card p-4', index === selected ? 'border-primary' : 'border-border')}
          >
            <Button
              variant={index === selected ? 'default' : 'outline'}
              size='icon'
              className='shrink-0 rounded-full'
              aria-pressed={index === selected}
              aria-label={t('PLACES_ADMIN_MOVE_PIN')}
              title={t('PLACES_ADMIN_MOVE_PIN')}
              onClick={() => setSelected(index)}
            >
              <MapPin />
            </Button>
            <div className='min-w-40 flex-1 space-y-1'>
              <Label htmlFor={`place-${index}`} className='text-xs text-muted-foreground'>
                {t('PLACES_ADMIN_NAME')}
              </Label>
              <Input id={`place-${index}`} value={place.name} onChange={(event) => change(index, { name: event.target.value })} />
            </div>
            <Label className='flex h-10 items-center gap-2 font-normal'>
              <Checkbox checked={place.isLive} onCheckedChange={(value) => change(index, { isLive: value === true })} />
              {t('PLACES_ADMIN_LIVE')}
            </Label>
            <Button className='rounded-full' disabled={isPending} onClick={() => save(place)}>
              {isPending && <Loader2 className='animate-spin' />} {t('PLACES_ADMIN_SAVE')}
            </Button>
            {/* A saved place can get its Corral, the real meeting spot. */}
            {place.id && (
              <CorralForm place={place} corral={corrals[place.id] ?? null}>
                <Button variant={corrals[place.id] ? 'secondary' : 'outline'} className='rounded-full'>
                  <Store /> {corrals[place.id] ? corrals[place.id].name : t('CORRAL_ADMIN_NONE')}
                </Button>
              </CorralForm>
            )}
          </li>
        ))}
        <li>
          <Button variant='outline' className='rounded-full' onClick={add} disabled={drafts.some((place) => !place.id)}>
            <Plus /> {t('PLACES_ADMIN_ADD')}
          </Button>
        </li>
      </ul>
    </div>
  );
}
