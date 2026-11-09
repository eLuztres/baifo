'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import ProductMedia from '@/components/ProductMedia';
import ExploreSearch, { type SearchChoice } from '@/components/shared/explore-search';
import { useI18n } from '@/components/i18n-provider';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { ListingType } from '@/lib/constants';
import { TYPE_FILTERS } from '@/lib/explore-filters';
import { mainMatches, queryWords, type SearchableText } from '@/lib/search-text';
import { KIND_LINK, LISTING_LINK, SEARCH_PATH, TAG_LINK } from './mercadillo-search-links';

/** An online listing the admin can put in a Mercadillo. */
export interface PickableListing {
  id: string;
  name: string;
  image: string | null;
  /** The Mercadillos it is in now. */
  mercadilloIds: string[];
  type: ListingType;
  tagIds: string[];
  /** What the search finds it by, as on /explore. */
  text: SearchableText;
}


/** The listings the chosen link narrows the list to. */
function narrowed(listings: PickableListing[], link: string) {
  if (link.startsWith(KIND_LINK)) {
    const kind = TYPE_FILTERS.find((filter) => filter.params[0] === link.slice(KIND_LINK.length));
    return listings.filter((listing) => kind?.types.includes(listing.type));
  }
  if (link.startsWith(TAG_LINK)) return listings.filter((listing) => listing.tagIds.includes(link.slice(TAG_LINK.length)));
  const words = queryWords(new URLSearchParams(link.split('?')[1]).get('q') ?? '');
  return words.length > 0 ? mainMatches(listings, (listing) => listing.text, words) : listings;
}

interface MercadilloListingsProps {
  /** The Mercadillo being edited; a new one has none yet. */
  mercadilloId?: string;
  listings: PickableListing[];
  /** The kinds and etiquetas the search offers, as on /explore. */
  choices: SearchChoice[];
  tags: SearchChoice[];
  /** Every Mercadillo's name, for "Also in …". */
  mercadilloNames: Record<string, string>;
  chosenIds: string[];
  onChange: (ids: string[]) => void;
}

const Thumb = ({ src, alt }: { src: string | null; alt: string }) => (
  <span className='relative block aspect-[3/4] w-full overflow-hidden rounded-lg bg-muted'>{src && <ProductMedia src={src} alt={alt} fill sizes='4rem' className='object-cover' />}</span>
);

/** The Mercadillo's listings as small pictures, and a list of all listings with checkboxes to choose them. */
export default function MercadilloListings({ mercadilloId, listings, choices, tags, mercadilloNames, chosenIds, onChange }: MercadilloListingsProps) {
  const { t } = useI18n();
  const [picked, setPicked] = useState<string[] | null>(null);
  // What the search narrowed the list to, and what its field shows for it.
  const [filter, setFilter] = useState<{ link: string; label: string } | null>(null);
  const chosen = listings.filter((listing) => chosenIds.includes(listing.id));
  const found = filter ? narrowed(listings, filter.link) : listings;
  const searchListings = listings.map((listing) => ({ href: `${LISTING_LINK}${listing.id}`, name: listing.name, image: listing.image ?? '', text: listing.text }));

  const openPicker = () => {
    setFilter(null);
    setPicked(chosenIds);
  };
  const pick = (link: string) => {
    // A listing chosen in the suggestions is ticked, never unticked: they don't show whether it was already.
    if (link.startsWith(LISTING_LINK)) {
      const id = link.slice(LISTING_LINK.length);
      return setPicked((current) => (current?.includes(id) ? current : [...(current ?? []), id]));
    }
    const query = new URLSearchParams(link.split('?')[1]).get('q');
    const label = query ?? [...choices, ...tags].find((choice) => choice.href === link)?.label ?? '';
    setFilter(link === SEARCH_PATH ? null : { link, label });
  };
  const togglePicked = (id: string) => setPicked((current) => (current?.includes(id) ? current.filter((one) => one !== id) : [...(current ?? []), id]));

  return (
    <div className='space-y-3 rounded-2xl border border-border p-3'>
      <div className='flex items-center justify-between gap-2'>
        <p className='font-medium'>{t('MERCADILLO_LISTINGS', { count: chosen.length })}</p>
        <Button type='button' size='sm' className='rounded-full' onClick={openPicker}>
          <Plus /> {t('MERCADILLO_LISTINGS_ADD')}
        </Button>
      </div>
      {chosen.length === 0 ? (
        <p className='text-sm text-muted-foreground'>{t('MERCADILLO_LISTINGS_EMPTY')}</p>
      ) : (
        <ul className='grid grid-cols-4 gap-2 sm:grid-cols-6'>
          {chosen.map((listing) => (
            <li key={listing.id} className='relative' title={listing.name}>
              <Thumb src={listing.image} alt={listing.name} />
              <button
                type='button'
                aria-label={t('MERCADILLO_LISTING_REMOVE', { name: listing.name })}
                onClick={() => onChange(chosenIds.filter((id) => id !== listing.id))}
                className='absolute -right-1.5 -top-1.5 grid size-7 place-items-center rounded-full border border-border bg-background shadow-sm hover:text-destructive'
              >
                <X className='size-3.5' />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={picked !== null} onOpenChange={(isOpen) => !isOpen && setPicked(null)}>
        {/* One height whatever the search leaves, so the window doesn't jump. */}
        <DialogContent className='flex h-[min(90dvh,44rem)] flex-col gap-3 p-4 sm:max-w-lg sm:p-6'>
          <DialogHeader>
            <DialogTitle>{t('MERCADILLO_LISTINGS_PICK')}</DialogTitle>
            <DialogDescription className='sr-only'>{t('MERCADILLO_LISTINGS_PICK')}</DialogDescription>
          </DialogHeader>
          <div className='flex h-11'>
            <ExploreSearch
              key={filter?.link ?? ''}
              listings={searchListings}
              choices={choices}
              tags={tags}
              value={filter?.label ?? ''}
              isFiltered={filter !== null}
              searchPath={SEARCH_PATH}
              onPick={pick}
            />
          </div>
          <ul className='-mx-2 min-h-0 flex-1 overflow-y-auto'>
            {found.map((listing) => {
              const elsewhere = listing.mercadilloIds.filter((id) => id !== mercadilloId).map((id) => mercadilloNames[id]).filter(Boolean);
              return (
                <li key={listing.id}>
                  <label className='flex cursor-pointer items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-muted'>
                    <Checkbox checked={picked?.includes(listing.id) ?? false} onCheckedChange={() => togglePicked(listing.id)} />
                    <span className='w-10 shrink-0'>
                      <Thumb src={listing.image} alt='' />
                    </span>
                    <span className='min-w-0 flex-1'>
                      <span className='block truncate text-sm'>{listing.name}</span>
                      {elsewhere.length > 0 && <span className='block truncate text-xs text-muted-foreground'>{t('MERCADILLO_LISTINGS_ALSO_IN', { names: elsewhere.join(', ') })}</span>}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
          <Button
            type='button'
            className='rounded-full'
            onClick={() => {
              onChange(picked ?? []);
              setPicked(null);
            }}
          >
            {t('MERCADILLO_LISTINGS_DONE', { count: picked?.length ?? 0 })}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
