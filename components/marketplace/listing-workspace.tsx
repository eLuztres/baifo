'use client';

import { useEffect, useState, useTransition } from 'react';
import { RotateCw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getAdminListing, retryAdminListing, type AdminListing } from '@/lib/marketplace/admin.actions';
import type { AdminTexts } from '@/lib/marketplace/admin-texts';
import AiProgress from './ai-progress';
import ListingEditor from './listing-editor';
import ListingStage from './listing-stage';
import PublishedView from './published-view';

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
  const [isJustPublished, setIsJustPublished] = useState(false);
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
    const hasAiPicture = listing.images.length > 0;
    return (
      <div className='mx-auto w-full max-w-xl space-y-5'>
        <ListingStage src={listing.images[0] ?? listing.rawImages[0]}>
          {!hasAiPicture && !listing.lastError && (
            <span className='absolute inset-0 animate-pulse bg-primary/15 motion-reduce:animate-none' />
          )}
          <span className='absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-background/90 px-3 py-1.5 text-sm font-medium shadow'>
            <Sparkles className='size-4 text-primary' /> {texts.aiWorkingTitle}
          </span>
        </ListingStage>
        <AiProgress listing={listing} texts={texts} />
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

  // Shown once the refresh brings the LIVE listing, so the done screen never shows a listing that isn't online.
  if (isJustPublished && listing.status === 'LIVE') {
    return (
      <PublishedView
        image={listing.images[0] ?? listing.rawImages[0]}
        title={listing.title ?? ''}
        price={listing.price}
        slug={listing.product?.slug}
        texts={texts}
        onKeepEditing={() => setIsJustPublished(false)}
      />
    );
  }

  const handlePublished = () => {
    setIsJustPublished(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <ListingEditor
      key={listing.status}
      listing={listing}
      categories={categories}
      texts={texts}
      houseSeller={houseSeller}
      onPublished={handlePublished}
    />
  );
}
