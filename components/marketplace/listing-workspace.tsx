'use client';

import { useEffect, useState } from 'react';
import { useI18n } from '@/components/i18n-provider';
import { aiErrorText } from '@/lib/ai-errors';
import { Loader2 } from 'lucide-react';
import { getAdminListing, type AdminListing } from '@/lib/marketplace/admin.actions';
import type { AdminTexts } from '@/lib/marketplace/admin-texts';
import { coverPicture, pictureOf } from '@/lib/video';
import DescriptionStep from './description-step';
import ListingEditor, { type CategoryOption, type EditorLanguage, type PlaceOption } from './listing-editor';
import ListingStage from './listing-stage';
import ListingSteps from './listing-steps';
import PublishedView from './published-view';

interface ListingWorkspaceProps {
  initial: AdminListing;
  categories: CategoryOption[];
  places: PlaceOption[];
  /** The shop's other languages, each with its own title and description. */
  languages: EditorLanguage[];
  /** The shop's own language, the first tab in the editor. */
  shopLanguage: EditorLanguage;
  texts: AdminTexts;
}

const POLL_MS = 2500;

/** Step 2 of a new listing (the description, then the listing to check and publish), or any listing to edit. */
export default function ListingWorkspace({ initial, categories, places, languages, shopLanguage, texts }: ListingWorkspaceProps) {
  const { t } = useI18n();
  const [listing, setListing] = useState(initial);
  const [isJustPublished, setIsJustPublished] = useState(false);
  // Still collecting with photos (or video stills) but no pictures yet: the AI is making them. Without any it waits for the description.
  const isMakingPictures = listing.status === 'COLLECTING' && listing.images.length === 0 && listing.rawImages.some(pictureOf);
  // The AI is busy: on the pictures (still collecting) or on the text.
  const isWaiting = !listing.lastError && (listing.status === 'PROCESSING' || isMakingPictures);

  // Server renders (after an action's refresh) bring a newer listing.
  useEffect(() => setListing(initial), [initial]);

  useEffect(() => {
    if (!isWaiting) return;
    const timer = setInterval(async () => {
      const next = await getAdminListing(listing.id);
      if (next) setListing(next);
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [isWaiting, listing.id]);

  // Shown once the refresh brings the LIVE listing, so the done screen never shows a listing that isn't online.
  if (isJustPublished && listing.status === 'LIVE') {
    return (
      <PublishedView
        image={coverPicture(listing.images) ?? coverPicture(listing.rawImages)}
        title={listing.title ?? ''}
        price={listing.price}
        priceMax={listing.priceMax}
        slug={listing.product?.slug}
        texts={texts}
        onKeepEditing={() => setIsJustPublished(false)}
      />
    );
  }

  const steps = listing.createdByAdmin && listing.status !== 'LIVE' && <ListingSteps current={1} texts={texts} />;

  // Opened again before the pictures were done (e.g. a reload on step 1).
  if (isMakingPictures) {
    return (
      <div className='mx-auto w-full max-w-xl space-y-4'>
        <ListingSteps current={0} texts={texts} />
        <ListingStage src={listing.rawImages[0]} className='mx-auto aspect-square max-h-[52svh] max-w-[52svh] sm:max-h-none sm:max-w-none'>
          {!listing.lastError && <span className='absolute inset-0 animate-pulse bg-primary/15 motion-reduce:animate-none' />}
        </ListingStage>
        <p className='flex items-center justify-center gap-2 text-sm text-muted-foreground'>
          <Loader2 className='size-4 animate-spin text-primary' /> {listing.lastError ? (aiErrorText(t, listing.lastError) ?? texts.errorGeneric) : texts.picturesWorking}
        </p>
      </div>
    );
  }

  if (listing.status === 'COLLECTING' || listing.status === 'PROCESSING') {
    return (
      <div className='space-y-4'>
        {steps}
        <DescriptionStep listing={listing} languages={languages} texts={texts} onSent={setListing} />
      </div>
    );
  }

  const handlePublished = () => {
    setIsJustPublished(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className='space-y-4'>
      {steps}
      <ListingEditor
        key={listing.status}
        listing={listing}
        categories={categories}
        places={places}
        languages={languages}
        shopLanguage={shopLanguage}
        texts={texts}
        onPublished={handlePublished}
      />
    </div>
  );
}
