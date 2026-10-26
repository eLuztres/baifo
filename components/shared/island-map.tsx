'use client';

import type { ShopPlace } from '@/lib/places-core';
import { cn } from '@/lib/utils';

interface IslandMapProps {
  places: ShopPlace[];
  chosen: string[];
  soonLabel: string;
  onToggle: (slug: string) => void;
  className?: string;
}

// The island picture's own proportions (public/brand/island.svg), so the pins' % positions land on the right towns.
export const ISLAND_RATIO = '420 / 490';
export const ISLAND_MASK = 'url(/brand/island.svg) center / contain no-repeat';

// Names go where there's room: above a pin at the top edge, else away from the middle of the picture.
const labelSide = ({ x, y }: ShopPlace) => (y < 10 ? 'top' : x < 50 ? 'right' : 'left');

const LABEL_CLASS = {
  top: 'bottom-full left-1/2 mb-1 -translate-x-1/2',
  right: 'left-full top-1/2 ml-1 -translate-y-1/2',
  left: 'right-full top-1/2 mr-1 -translate-y-1/2',
};

/** The island with a pin per place: a tap switches a live place on or off; the ones not open yet show as "soon".
    Pair it with a list of the same places for keyboards and screen readers. */
export default function IslandMap({ places, chosen, soonLabel, onToggle, className }: IslandMapProps) {
  return (
    <div className={cn('relative mx-auto pt-8', className)} style={{ aspectRatio: ISLAND_RATIO }}>
      <div className='absolute inset-x-0 bottom-0 top-8 bg-primary/15' style={{ mask: ISLAND_MASK, WebkitMask: ISLAND_MASK }} aria-hidden />
      <div className='absolute inset-x-0 bottom-0 top-8'>
        {places.map((place) => {
          const isOn = place.isLive && chosen.includes(place.slug);
          return (
            <button
              key={place.slug}
              type='button'
              // The list under the map is the accessible control; the pins are a shortcut for the eye and the finger.
              aria-hidden
              tabIndex={-1}
              onClick={() => place.isLive && onToggle(place.slug)}
              style={{ left: `${place.x}%`, top: `${place.y}%` }}
              className={cn(
                'group absolute flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full focus-visible:outline-none',
                !place.isLive && 'cursor-default'
              )}
            >
              <span
                className={cn(
                  'size-4 rounded-full border-2 shadow transition',
                  isOn ? 'scale-125 border-background bg-primary' : place.isLive ? 'border-primary bg-background' : 'border-background bg-muted-foreground/40'
                )}
              />
              <span
                className={cn(
                  'pointer-events-none absolute whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium shadow-sm',
                  LABEL_CLASS[labelSide(place)],
                  isOn ? 'bg-primary text-primary-foreground' : 'bg-background/90',
                  !place.isLive && 'text-muted-foreground'
                )}
              >
                {place.name}
                {!place.isLive && <span className='ml-1 font-normal'>· {soonLabel}</span>}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
