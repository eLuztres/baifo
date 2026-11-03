'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { adminPreviewSlug } from '@/lib/marketplace/preview-slug';
import { getAdminListing, type AdminListing } from '@/lib/marketplace/admin.actions';
import type { AdminTexts } from '@/lib/marketplace/admin-texts';
import { coverPicture, pictureOf } from '@/lib/video';
import DescriptionStep from './description-step';
import type { CategoryOption, EditorLanguage } from './editor-types';
import LeaveGuard from './leave-guard';
import ListingSteps from './listing-steps';
import PictureTabs from './picture-tabs';
import PublishedView from './published-view';

interface ListingWorkspaceProps {
  initial: AdminListing;
  categories: CategoryOption[];
  /** The shop's other languages, each with its own title and description. */
  languages: EditorLanguage[];
  /** The shop's own language, the first tab in the editor. */
  shopLanguage: EditorLanguage;
  /** How many days a listing stays online by default (LISTING_DAYS). */
  listingDays: number;
  texts: AdminTexts;
}

const POLL_MS = 2500;

/** A new listing's three steps (pictures, description, contact) in any order, then the listing to check and publish; or any listing to edit. */
export default function ListingWorkspace({ initial, categories, languages, shopLanguage, listingDays, texts }: ListingWorkspaceProps) {
  const router = useRouter();
  const [listing, setListing] = useState(initial);
  const [isJustPublished, setIsJustPublished] = useState(false);
  // "Enviar a la persona" instead of "Publicar": it ends ready to send, not online.
  const [isForPerson, setIsForPerson] = useState(false);
  // 0 pictures, 1 description, 2 contact: free to move between them until the description is sent.
  const [step, setStep] = useState(0);
  // Still collecting with photos (or video stills) but no pictures yet: an older listing whose AI is making them.
  const isMakingPictures = listing.status === 'COLLECTING' && listing.usesAi && listing.images.length === 0 && listing.rawImages.some(pictureOf);
  // After "Publicar" it goes online by itself once written; an event without a date stays in the editor for one.
  const isGoingLive = isJustPublished && !isForPerson && listing.status === 'IN_REVIEW' && listing.autoPublish && !(listing.type === 'EVENT' && !listing.startsAt);
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

  // After "Publicar" the admin sees the listing as visitors do: online on its page, Oculto on its admin-only preview.
  const doneHref =
    !isJustPublished || isForPerson
      ? null
      : listing.status === 'LIVE' && listing.product?.slug
        ? `/product/${listing.product.slug}`
        : listing.status === 'IN_REVIEW' && !listing.autoPublish
          ? `/product/${adminPreviewSlug(listing.id)}`
          : null;
  useEffect(() => {
    if (doneHref) router.push(doneHref);
  }, [doneHref, router]);
  if (doneHref) {
    return (
      <div className='flex justify-center py-16'>
        <Loader2 className='size-8 animate-spin text-primary' aria-label={texts.status_PROCESSING} />
      </div>
    );
  }

  // "Enviar a la persona": ready to send once the refresh brings it.
  const isReadyToSend = isJustPublished && isForPerson && (listing.status === 'IN_REVIEW' || listing.status === 'AWAITING_PAYMENT');
  if (isReadyToSend) {
    return (
      <PublishedView
        listingId={listing.id}
        type={listing.type}
        isForPerson={isReadyToSend}
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

  // Free to move between the steps, for a new listing and an existing one alike; not while the AI writes it.
  const canSwitchSteps = listing.status !== 'PROCESSING';
  const isEditing = listing.status !== 'COLLECTING' && listing.status !== 'PROCESSING' && !isGoingLive;
  const shownStep = canSwitchSteps ? step : 1;
  const title = isEditing ? (listing.type === 'EVENT' ? texts.editEvent : texts.editListing) : listing.type === 'EVENT' ? texts.newEvent : texts.newListing;
  return (
    <div className='space-y-3 sm:space-y-4'>
      {/* A new listing is only saved on publishing: leaving loses it. */}
      {listing.status === 'COLLECTING' && <LeaveGuard hasWork={listing.images.length > 0 || listing.rawImages.length > 0} texts={texts} />}
      <h1 className='text-center font-display text-2xl sm:text-3xl'>{title}</h1>
      <ListingSteps current={shownStep} texts={texts} onSelect={canSwitchSteps ? setStep : undefined} />
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
      {/* The description, contact and "Más" steps, and on every step the button that finishes or saves. */}
      <DescriptionStep
        listing={listing}
        languages={languages}
        shopLanguage={shopLanguage}
        categories={categories}
        listingDays={listingDays}
        texts={texts}
        onSent={(next, forPerson = false) => {
          setListing(next);
          setIsForPerson(forPerson);
          setIsJustPublished(true);
        }}
        step={shownStep}
        onStep={setStep}
      />
    </div>
  );
}
