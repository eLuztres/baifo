'use client';

import { useEffect, useState, useTransition } from 'react';
import { RotateCw } from 'lucide-react';
import ProductMedia from '@/components/ProductMedia';
import { Button } from '@/components/ui/button';
import { getAdminListing, retryAdminListing, type AdminListing } from '@/lib/marketplace/admin.actions';
import type { AdminTexts } from '@/lib/marketplace/admin-texts';
import AiProgress from './ai-progress';
import ListingEditor from './listing-editor';

interface ListingWorkspaceProps {
  initial: AdminListing;
  categories: string[];
  texts: AdminTexts;
  houseSeller: string;
}

const POLL_MS = 2500;

/** While the AI works it shows the progress and polls; then the editor takes over by itself. */
export default function ListingWorkspace({ initial, categories, texts, houseSeller }: ListingWorkspaceProps) {
  const [listing, setListing] = useState(initial);
  const [isPending, startTransition] = useTransition();
  const isWorking = listing.status === 'PROCESSING' && !listing.lastError;

  // Server renders (after an action's refresh) bring a newer listing.
  useEffect(() => setListing(initial), [initial]);

  useEffect(() => {
    if (!isWorking) return;
    const timer = setInterval(async () => {
      const next = await getAdminListing(listing.id);
      if (next) setListing(next);
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [isWorking, listing.id]);

  if (listing.status === 'PROCESSING') {
    return (
      <div className='space-y-6'>
        <AiProgress listing={listing} texts={texts} />
        <ul className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
          {(listing.images.length > 0 ? listing.images : listing.rawImages).map((url) => (
            <li key={url} className='relative aspect-square overflow-hidden rounded-2xl border border-border bg-muted'>
              <ProductMedia src={url} alt='' fill />
              {listing.images.length === 0 && <span className='absolute inset-0 animate-pulse bg-primary/10' />}
            </li>
          ))}
        </ul>
        {listing.lastError ? (
          <div className='space-y-3 rounded-2xl border border-destructive/40 p-4'>
            <p className='text-sm text-destructive'>{listing.lastError}</p>
            <Button
              variant='outline'
              className='rounded-full'
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  await retryAdminListing(listing.id);
                  setListing({ ...listing, lastError: null });
                })
              }
            >
              <RotateCw /> {texts.retry}
            </Button>
          </div>
        ) : (
          <p className='text-sm text-muted-foreground'>{texts.aiHint}</p>
        )}
      </div>
    );
  }

  return <ListingEditor key={listing.status} listing={listing} categories={categories} texts={texts} houseSeller={houseSeller} />;
}
