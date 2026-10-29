'use client';

import { useEffect, useState } from 'react';
import { getAdminListing, type AdminListing } from '@/lib/marketplace/admin.actions';
import type { AdminTexts } from '@/lib/marketplace/admin-texts';
import { coverPicture, pictureOf } from '@/lib/video';
import DescriptionStep from './description-step';
import ListingEditor, { type CategoryOption, type EditorLanguage, type PlaceOption } from './listing-editor';
import ListingSteps from './listing-steps';
import NewListingForm from './new-listing-form';
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
  const [listing, setListing] = useState(initial);
  const [isJustPublished, setIsJustPublished] = useState(false);
  // Until the description is sent, the admin can go back to the photos and return to the text as it was.
  const [isOnPhotos, setIsOnPhotos] = useState(false);
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

  const canSwitchSteps = listing.createdByAdmin && listing.status === 'COLLECTING';
  const steps = listing.createdByAdmin && listing.status !== 'LIVE' && (
    <ListingSteps current={1} texts={texts} onSelect={canSwitchSteps ? () => setIsOnPhotos(true) : undefined} />
  );

  const backFromPhotos = (next: AdminListing) => {
    setListing(next);
    setIsOnPhotos(false);
  };

  // While the AI still makes the pictures too: the admin writes the description meanwhile.
  if (listing.status === 'COLLECTING' || listing.status === 'PROCESSING') {
    const showsPhotos = isOnPhotos && canSwitchSteps;
    return (
      <div className='space-y-3 sm:space-y-4'>
        {showsPhotos ? <NewListingForm texts={texts} type={listing.type} listing={listing} onDone={backFromPhotos} /> : steps}
        {/* Only hidden on the photos, so everything written stays. */}
        <div hidden={showsPhotos}>
          <DescriptionStep listing={listing} languages={languages} texts={texts} onSent={setListing} />
        </div>
      </div>
    );
  }

  const handlePublished = () => {
    setIsJustPublished(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className='space-y-3 sm:space-y-4'>
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
