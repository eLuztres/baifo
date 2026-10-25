'use client';

import { useEffect, useState, useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getAdminListing, retryAdminListing, type AdminListing } from '@/lib/marketplace/admin.actions';
import type { AdminTexts } from '@/lib/marketplace/admin-texts';
import CategoryStep, { type CategoryOption } from './category-step';
import ListingEditor, { type EditorLanguage } from './listing-editor';
import ListingSteps from './listing-steps';
import PublishedView from './published-view';

interface ListingWorkspaceProps {
  initial: AdminListing;
  categories: CategoryOption[];
  /** The shop's other languages, each with its own title and description. */
  languages: EditorLanguage[];
  texts: AdminTexts;
  houseSeller: string;
  /** Just created: show the category step even once the AI is done. */
  startsOnCategory: boolean;
}

const POLL_MS = 2500;

/** Steps 2 and 3 of a new listing: the category while the AI works (polled), then everything to check and publish. */
export default function ListingWorkspace({ initial, categories, languages, texts, houseSeller, startsOnCategory }: ListingWorkspaceProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [listing, setListing] = useState(initial);
  const [isPending, startTransition] = useTransition();
  const [isOnCategory, setIsOnCategory] = useState(startsOnCategory);
  const [isJustPublished, setIsJustPublished] = useState(false);
  const isWorking = listing.status === 'PROCESSING' && !listing.lastError;

  // Server renders (after an action's refresh) bring a newer listing.
  useEffect(() => setListing(initial), [initial]);

  useEffect(() => {
    if (!isWorking) return;
    const timer = setInterval(async () => {
      const next = await getAdminListing(listing.id);
      // The admin may already have changed the category the AI picked.
      if (next) setListing((current) => ({ ...next, category: current.category ?? next.category }));
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [isWorking, listing.id]);

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

  const showsSteps = listing.createdByAdmin && listing.status !== 'LIVE';

  if (listing.status === 'PROCESSING' || isOnCategory) {
    return (
      <div className='space-y-6'>
        {showsSteps && <ListingSteps current={1} texts={texts} />}
        <CategoryStep
          listing={listing}
          categories={categories}
          texts={texts}
          onCategoryChange={(slug) => setListing((current) => ({ ...current, category: slug }))}
          onNext={() => {
            setIsOnCategory(false);
            router.replace(pathname);
            window.scrollTo({ top: 0 });
          }}
        />
        {listing.lastError && (
          <div className='mx-auto max-w-xl space-y-3 rounded-2xl border border-destructive/40 p-4'>
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
        )}
      </div>
    );
  }

  const handlePublished = () => {
    setIsJustPublished(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className='space-y-6'>
      {showsSteps && <ListingSteps current={2} texts={texts} />}
      <ListingEditor
        key={listing.status}
        listing={listing}
        categories={categories}
        languages={languages}
        texts={texts}
        houseSeller={houseSeller}
        onPublished={handlePublished}
      />
    </div>
  );
}
