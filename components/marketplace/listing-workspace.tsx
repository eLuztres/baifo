'use client';

import { useEffect, useState } from 'react';
import { getAdminListing, type AdminListing } from '@/lib/marketplace/admin.actions';
import type { AdminTexts } from '@/lib/marketplace/admin-texts';
import { coverPicture, pictureOf } from '@/lib/video';
import DescriptionStep from './description-step';
import ListingEditor, { type CategoryOption, type EditorLanguage, type PlaceOption } from './listing-editor';
import ListingSteps from './listing-steps';
import PictureTabs from './picture-tabs';
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

/** A new listing's three steps (pictures, description, contact) in any order, then the listing to check and publish; or any listing to edit. */
export default function ListingWorkspace({ initial, categories, places, languages, shopLanguage, texts }: ListingWorkspaceProps) {
  const [listing, setListing] = useState(initial);
  const [isJustPublished, setIsJustPublished] = useState(false);
  // 0 pictures, 1 description, 2 contact: free to move between them until the description is sent.
  const [step, setStep] = useState(0);
  // Still collecting with photos (or video stills) but no pictures yet: an older listing whose AI is making them.
  const isMakingPictures = listing.status === 'COLLECTING' && listing.usesAi && listing.images.length === 0 && listing.rawImages.some(pictureOf);
  // After "Publicar" it goes online by itself once written; an event without a date stays in the editor for one.
  const isGoingLive = isJustPublished && listing.status === 'IN_REVIEW' && !(listing.type === 'EVENT' && !listing.startsAt);
  // The AI is busy: on the pictures (still collecting) or on the text, or the listing is on its way online.
  const isWaiting = !listing.lastError && (listing.status === 'PROCESSING' || isMakingPictures || isGoingLive);

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
        priceMode={listing.priceMode}
        slug={listing.product?.slug}
        texts={texts}
        onKeepEditing={() => setIsJustPublished(false)}
      />
    );
  }

  const canSwitchSteps = listing.createdByAdmin && listing.status === 'COLLECTING';
  // The listing to check and publish comes after the last step.
  const steps = listing.createdByAdmin && listing.status !== 'LIVE' && (
    <ListingSteps current={2} texts={texts} />
  );

  // While the AI writes, the description stays in view with what it is doing.
  if (listing.status === 'COLLECTING' || listing.status === 'PROCESSING' || isGoingLive) {
    const shownStep = canSwitchSteps ? step : 1;
    return (
      <div className='space-y-3 sm:space-y-4'>
        {/* Anuncio or Evento was chosen under "Crear"; the editor can still switch it afterwards. */}
        {listing.createdByAdmin && <h1 className='text-center font-display text-2xl sm:text-3xl'>{listing.type === 'EVENT' ? texts.newEvent : texts.newListing}</h1>}
        {listing.createdByAdmin && <ListingSteps current={shownStep} texts={texts} onSelect={canSwitchSteps ? setStep : undefined} />}
        {/* Only hidden on the other steps, so a picture still being made arrives and nothing written is lost. */}
        {canSwitchSteps && (
          <div hidden={shownStep !== 0} className='space-y-4'>
            <PictureTabs
              listingId={listing.id}
              initial={{ images: listing.images, rawImages: listing.rawImages, aiImages: listing.aiImages }}
              texts={texts}
              onChange={(pictures) => setListing((current) => ({ ...current, ...pictures }))}
            />
          </div>
        )}
        {/* The description and contact steps, and on every step the button that finishes the setup. */}
        <DescriptionStep
          listing={listing}
          languages={languages}
          texts={texts}
          onSent={(next) => {
            setListing(next);
            setIsJustPublished(true);
          }}
          step={shownStep}
          onStep={setStep}
        />
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
