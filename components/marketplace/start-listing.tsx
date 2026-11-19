'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import type { ListingType } from '@/lib/constants';
import { startAdminListing } from '@/lib/marketplace/admin.actions';
import { startPartnerListing } from '@/lib/actions/partner.actions';
import { partnerListingPath } from '@/lib/partner-paths';
import type { AdminTexts } from '@/lib/marketplace/admin-texts';

interface StartListingProps {
  type: ListingType;
  texts: AdminTexts;
  /** A partner in its panel: the draft is its mercadillo's and opens in the panel. */
  isPartner?: boolean;
}

/** "Nuevo anuncio" opens a draft right away, so its pictures, description and contact can be filled in any order. */
export default function StartListing({ type, texts, isPartner }: StartListingProps) {
  const router = useRouter();
  // Strict mode runs effects twice: one draft only.
  const isStarted = useRef(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isStarted.current) return;
    isStarted.current = true;
    (isPartner ? startPartnerListing(type) : startAdminListing(type)).then((result) => {
      if ('id' in result && result.id) router.replace(isPartner ? partnerListingPath(result.id) : `/admin/listings/new?anuncio=${result.id}`);
      else setError(result.message);
    });
  }, [type, router, isPartner]);

  if (error) {
    return (
      <p role='alert' className='mx-auto max-w-xl rounded-2xl border border-destructive/40 p-3 text-sm text-destructive'>
        {error}
      </p>
    );
  }
  return (
    <div className='flex justify-center py-16' aria-label={texts.newListing}>
      <Loader2 className='size-8 animate-spin text-primary' />
    </div>
  );
}
