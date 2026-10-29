'use client';

import { useEffect, useRef, useState } from 'react';
import type { ListingType } from '@/lib/constants';
import { getAdminListing, updateAdminListingPhotos, type AdminListing } from '@/lib/marketplace/admin.actions';
import type { AdminTexts } from '@/lib/marketplace/admin-texts';
import { coverPicture, pictureOf } from '@/lib/video';
import DescriptionStep from './description-step';
import ListingEditor, { type CategoryOption, type EditorLanguage, type PlaceOption } from './listing-editor';
import ListingSteps from './listing-steps';
import ListingTypeTabs from './listing-type-tabs';
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

  // Set when the switch to an event turned its AI pictures off, so switching away turns them back on.
  const isAiOffForEvent = useRef(false);
  const [typeError, setTypeError] = useState('');

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

  // Everything written stays: only what depends on the type follows (the AI's prompt, the hints, the photo choices).
  // An event uses its photos as they are, and one without any still gets its picture from the description.
  const switchType = async (next: ListingType) => {
    const turnsAiOff = next === 'EVENT' && listing.usesAi && listing.rawImages.length > 0;
    const turnsAiOn = next !== 'EVENT' && isAiOffForEvent.current;
    const useAi = turnsAiOff ? false : turnsAiOn || listing.usesAi;
    setTypeError('');
    setListing((current) => ({ ...current, type: next }));
    const result = await updateAdminListingPhotos(listing.id, { photos: listing.rawImages, useAi, type: next });
    if (!result.success) {
      setTypeError(result.message);
      setListing((current) => ({ ...current, type: listing.type }));
      return;
    }
    if (turnsAiOff || turnsAiOn) isAiOffForEvent.current = turnsAiOff;
    if (useAi !== listing.usesAi) {
      const saved = await getAdminListing(listing.id);
      if (saved) setListing(saved);
    }
  };

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
        {/* Locked while the AI writes for the chosen type; the editor switches it afterwards. */}
        {listing.createdByAdmin && <ListingTypeTabs type={listing.type} texts={texts} onSelect={switchType} hasInfo isDisabled={!canSwitchSteps} />}
        {typeError && (
          <p role='alert' className='mx-auto max-w-xl rounded-2xl border border-destructive/40 p-3 text-sm text-destructive'>
            {typeError}
          </p>
        )}
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
      <ListingEditor
        key={listing.status}
        listing={listing}
        categories={categories}
        places={places}
        languages={languages}
        shopLanguage={shopLanguage}
        texts={texts}
        onPublished={handlePublished}
        steps={steps}
      />
    </div>
  );
}
