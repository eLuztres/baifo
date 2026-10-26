'use client';

import type { ShopPlace } from '@/lib/places-core';
import { cn } from '@/lib/utils';

interface IslandMapProps {
  places: ShopPlace[];
  chosen: string[];
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

/** The island with a pin per place: a tap switches a live place on or off. Only live places carry their name; the ones
    not open yet are quiet dots, so a small screen isn't covered in labels. Pair it with a list for keyboards and screen readers. */
export default function IslandMap({ places, chosen, onToggle, className }: IslandMapProps) {
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
                  'rounded-full border-2 transition',
                  place.isLive ? 'size-4 shadow' : 'size-2.5 border-muted-foreground/40 bg-background/60',
                  place.isLive && (isOn ? 'scale-125 border-background bg-primary' : 'border-primary bg-background')
                )}
              />
              {place.isLive && (
                <span
                  className={cn(
                    'pointer-events-none absolute whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium shadow-sm',
                    LABEL_CLASS[labelSide(place)],
                    isOn ? 'bg-primary text-primary-foreground' : 'bg-background/90'
                  )}
                >
                  {place.name}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
